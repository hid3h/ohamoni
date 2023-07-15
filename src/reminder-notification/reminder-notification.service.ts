import { Client } from "@line/bot-sdk";
import { Injectable } from "@nestjs/common";
import { Account, ReminderNotificationSetting } from "@prisma/client";
import { AccountsService } from "src/accounts/accounts.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CloudTasksClient } from "@google-cloud/tasks";
import { credentials } from "@grpc/grpc-js";
import { formatInTimeZone, toDate, zonedTimeToUtc } from "date-fns-tz";
import { addDays, getUnixTime, isPast, parse } from "date-fns";

@Injectable()
export class ReminderNotificationService {
  private readonly linebotClient: Client;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly accountsService: AccountsService,
  ) {
    this.linebotClient = new Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    });
  }

  async notice({
    reminderNotificationSettingId,
  }: {
    reminderNotificationSettingId: string;
  }) {
    const reminderNotificationSetting =
      await this.prismaService.reminderNotificationSetting.findUnique({
        where: {
          id: reminderNotificationSettingId,
        },
        include: {
          account: true,
        },
      });

    const account = reminderNotificationSetting.account;
    const currentReminderNotificationSetting =
      await this.currentReminderNotificationSetting({
        account,
      });

    if (
      reminderNotificationSetting.id !== currentReminderNotificationSetting?.id
    ) {
      return;
    }

    const nowUTC = new Date();
    const nowJSTString = formatInTimeZone(
      nowUTC,
      "Asia/Tokyo",
      "yyyy-MM-dd HH:mm",
    );
    const todayJSTString = nowJSTString.slice(0, 10);
    const startOfJSTToday = toDate(todayJSTString + "T00:00:00.000+09:00");
    const endOfJSTToday = toDate(todayJSTString + "T23:59:59.999+09:00");
    console.log(
      `入力忘れ防止を通知しようとしています。nowUTC: ${nowUTC}, nowJSTString: ${nowJSTString}, todayJSTString: ${todayJSTString}, startOfJSTToday: ${startOfJSTToday}, endOfJSTToday: ${endOfJSTToday}`,
    );
    // タイムゾーン日本
    // 入力忘れ防止を通知しようとしています。nowUTC: Sat Jul 15 2023 12:07:00 GMT+0900 (Japan Standard Time), nowJSTString: 2023-07-15 12:07, todayJSTString: 2023-07-15, startOfJSTToday: Sat Jul 15 2023 00:00:00 GMT+0900 (Japan Standard Time), endOfJSTToday: Sat Jul 15 2023 23:59:59 GMT+0900 (Japan Standard Time)

    const todayGettingUp = await this.prismaService.gettingUp.findFirst({
      where: {
        accountId: account.id,
        gotUpAt: {
          gte: startOfJSTToday,
          lte: endOfJSTToday,
        },
      },
      include: {
        gettingUpDeletion: true,
      },
      orderBy: {
        registeredAt: "desc",
      },
    });
    if (!todayGettingUp || todayGettingUp.gettingUpDeletion) {
      const lineUserId = account.lineUserId;
      await this.linebotClient.pushMessage(lineUserId, {
        type: "text",
        text: "入力忘れ防止通知です。\n今日の記録を入力しましょう。",
      });
      console.log(
        `入力忘れ防止をLINE通知しました。reminderNotificationSettingId: ${reminderNotificationSettingId}`,
      );
    } else {
      console.log(
        `今日の分は入力済みなのでLINE通知しませんでした。todayGettingUpId: ${todayGettingUp.id}`,
      );
    }

    const remindeDateUTC = toDate(
      `${todayJSTString}T${reminderNotificationSetting.reminderTime}:00+09:00`,
    );
    const nextRemindeDateUTC = addDays(remindeDateUTC, 1);
    const nextRemindeDateUnixSeconds = getUnixTime(nextRemindeDateUTC);

    console.log(
      `次の日の通知をスケジュールします. remindeDateUTC: ${remindeDateUTC}, nextRemindeDateUTC: ${nextRemindeDateUTC}, nextRemindeDateUnixSeconds: ${nextRemindeDateUnixSeconds}`,
    );
    await this.scheduleNotification({
      reminderNotificationSetting,
      scheduleTimeUnixSeconds: nextRemindeDateUnixSeconds,
    });
    console.log("次の日の通知をスケジュールしました");
  }

  async replyReminderSetting({
    lineUserId,
    replyToken,
    turnOffNotificationLineActionData,
    setNotificationDateLineActionData,
  }: {
    lineUserId: string;
    replyToken: string;
    turnOffNotificationLineActionData: string;
    setNotificationDateLineActionData: string;
  }) {
    const account = await this.accountsService.findOrRegister({ lineUserId });

    const reminderNotificationSetting =
      await this.currentReminderNotificationSetting({
        account,
      });

    if (reminderNotificationSetting) {
      await this.linebotClient.replyMessage(replyToken, {
        type: "template",
        altText: "入力忘れ防止通知の設定",
        template: {
          type: "buttons",
          text: `入力忘れ防止通知は ${reminderNotificationSetting.reminderTime} に設定されています`,
          actions: [
            {
              type: "datetimepicker",
              label: "時間を変更する",
              mode: "time",
              data: setNotificationDateLineActionData,
            },
            {
              type: "postback",
              label: "通知を解除する",
              data: turnOffNotificationLineActionData,
            },
          ],
        },
      });
      return;
    }

    await this.linebotClient.replyMessage(replyToken, {
      type: "template",
      altText: "入力忘れ防止通知の設定",
      template: {
        type: "buttons",
        text: `入力忘れ防止通知の時間を設定できます`,
        actions: [
          {
            type: "datetimepicker",
            label: "通知時間を入力する",
            mode: "time",
            data: setNotificationDateLineActionData,
          },
        ],
      },
    });
  }

  async set({
    lineUserId,
    time,
    replyToken,
  }: {
    lineUserId: string;
    time: string;
    replyToken: string;
  }) {
    const account = await this.accountsService.findOrRegister({ lineUserId });

    const reminderNotificationSetting =
      await this.prismaService.reminderNotificationSetting.create({
        data: {
          accountId: account.id,
          reminderTime: time,
          registeredAt: new Date(),
        },
      });

    await this.linebotClient.replyMessage(replyToken, {
      type: "text",
      text: `入力忘れ防止通知を ${time} に設定しました`,
    });

    let nextTime = parse(time, "HH:mm", new Date());

    if (isPast(nextTime)) {
      nextTime = addDays(nextTime, 1);
      console.log("nextTime2", nextTime);
    }
    // time 08:50
    // タイムゾーン日本
    // nextTime 2023-07-12T23:50:00.000Z
    // nextTime2 2023-07-13T23:50:00.000Z
    // UTCの今日になる

    // タイムゾーンUTC
    //  time 07:56
    // nextTime 2023-07-13T07:56:00.000Z
    // nextTime2 2023-07-14T07:56:00.000Z
    // 日本時間になってる

    // console.log("zone1", zonedTimeToUtc(nextTime, "Asia/Tokyo"));
    // console.log("zone2", zonedTimeToUtc(nextTime, "UTC"));
    // タイムゾーン日本
    // nextTime 2023-07-13T11:33:00.000Z
    // zone1 2023-07-13T11:33:00.000Z
    // zone2 2023-07-13T20:33:00.000Z
    // console.log("getUnixTime(nextTime)", getUnixTime(nextTime));
    // タイムゾーンUTC
    // time 20:51
    // nextTime 2023-07-13T20:51:00.000Z
    // zone1 2023-07-13T11:51:00.000Z
    // zone2 2023-07-13T20:51:00.000Z
    // getUnixTime(nextTime) 1689281460
    const zonedNextTimeUTC = zonedTimeToUtc(nextTime, "Asia/Tokyo");
    // console.log("zonedNextTimeUTC", zonedNextTimeUTC);
    const unixTime = getUnixTime(zonedNextTimeUTC);
    // console.log("unixTime", unixTime);

    console.log(
      `入力忘れ防止通知を設定します. time: ${time}, nextTime: ${nextTime}, zonedNextTimeUTC: ${zonedNextTimeUTC}, unixTime: ${unixTime}`,
    );
    // タイムゾーンUTC
    // time: 12:44, nextTime: Sat Jul 15 2023 12:44:00 GMT+0000 (協定世界時), zonedNextTimeUTC: Sat Jul 15 2023 03:44:00 GMT+0000 (協定世界時), unixTime: 1689392640"
    // nextTimeのとこが嘘になってる
    await this.scheduleNotification({
      reminderNotificationSetting,
      scheduleTimeUnixSeconds: unixTime,
    });
    console.log("入力忘れ防止通知を設定しました");
  }

  async cancell({
    lineUserId,
    replyToken,
  }: {
    lineUserId: string;
    replyToken: string;
  }) {
    const account = await this.accountsService.findOrRegister({ lineUserId });

    await this.prismaService.reminderNotificationSettingCancellation.create({
      data: {
        accountId: account.id,
        cancelledAt: new Date(),
      },
    });

    await this.linebotClient.replyMessage(replyToken, {
      type: "text",
      text: `通知を解除しました`,
    });
  }

  private async currentReminderNotificationSetting({
    account,
  }: {
    account: Pick<Account, "id">;
  }) {
    const reminderNotificationSetting =
      await this.prismaService.reminderNotificationSetting.findFirst({
        where: {
          accountId: account.id,
        },
        orderBy: {
          registeredAt: "desc",
        },
      });

    if (!reminderNotificationSetting) {
      return null;
    }

    const reminderNotificationSettingCancellation =
      await this.prismaService.reminderNotificationSettingCancellation.findFirst(
        {
          where: {
            accountId: account.id,
          },
          orderBy: {
            cancelledAt: "desc",
          },
        },
      );

    if (!reminderNotificationSettingCancellation) {
      return reminderNotificationSetting;
    }

    if (
      reminderNotificationSetting.registeredAt <
      reminderNotificationSettingCancellation.cancelledAt
    ) {
      return null;
    }

    return reminderNotificationSetting;
  }

  private async scheduleNotification({
    reminderNotificationSetting,
    scheduleTimeUnixSeconds,
  }: {
    reminderNotificationSetting: Pick<ReminderNotificationSetting, "id">;
    scheduleTimeUnixSeconds: number;
  }) {
    // console.log("cloudTaskClientのnew開始");
    const cloudTaskClient =
      process.env.NODE_ENV === "production"
        ? new CloudTasksClient({ fallback: true }) // Deadline exceeded が発生するので fallback: true を設定する.原因は不明
        : new CloudTasksClient({
            port: 8133,
            servicePath: "localhost",
            sslCreds: credentials.createInsecure(),
          });
    // 本番Cloud Runでインスタンスの取得に1分もかかっている。謎
    // console.log("cloudTaskClientnew終了");

    const parent = cloudTaskClient.queuePath(
      process.env.GOOGLE_CLOUD_PROJECT,
      "asia-northeast1",
      process.env.QUEUE_NAME,
    );

    await cloudTaskClient.createTask({
      parent,
      task: {
        scheduleTime: {
          seconds: scheduleTimeUnixSeconds,
        },
        httpRequest: {
          httpMethod: "POST",
          url: `${process.env.BASE_URL}/api/reminder-notifications`,
          body: Buffer.from(
            JSON.stringify({
              reminderNotificationSettingId: reminderNotificationSetting.id,
            }),
          ).toString("base64"),
          oidcToken: {
            serviceAccountEmail: process.env.SERVICE_ACCOUNT_EMAIL ?? undefined,
          },
          headers: {
            "Content-Type": "application/json",
          },
        },
      },
    });
  }
}
