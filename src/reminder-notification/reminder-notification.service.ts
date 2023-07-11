import { Client } from "@line/bot-sdk";
import { Injectable } from "@nestjs/common";
import { Account } from "@prisma/client";
import { AccountsService } from "src/accounts/accounts.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CloudTasksClient } from "@google-cloud/tasks";
import { credentials } from "@grpc/grpc-js";

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
          text: `${reminderNotificationSetting.reminderTime} に設定されています`,
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
      text: `${time} に設定しました`,
    });

    const cloudTaskClient = this.getCloudTaskClient();
    console.log("cloudTaskClient", cloudTaskClient);
    console.log(
      "process.env.GOOGLE_CLOUD_PROJECT",
      process.env.GOOGLE_CLOUD_PROJECT,
    );
    const parent = cloudTaskClient.queuePath(
      process.env.GOOGLE_CLOUD_PROJECT,
      "asia-northeast1",
      process.env.QUEUE_NAME,
    );
    console.log("parent", parent);
    console.log("process.env.BASE_URL", process.env.BASE_URL);
    await cloudTaskClient.createTask({
      parent,
      task: {
        httpRequest: {
          httpMethod: "POST",
          url: `${process.env.BASE_URL}/api/reminder-notifications`,
          body: Buffer.from(
            JSON.stringify({
              reminderNotificationSettingId: reminderNotificationSetting.id,
            }),
          ).toString("base64"),
          oidcToken: {
            serviceAccountEmail: process.env.SERVICE_ACCOUNT_EMAIL,
          },
        },
      },
    });
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

  private getCloudTaskClient() {
    console.log("NODE_ENV", process.env.NODE_ENV);
    return process.env.NODE_ENV === "production"
      ? new CloudTasksClient({ fallback: true })
      : new CloudTasksClient({
          port: 8133,
          servicePath: "localhost",
          sslCreds: credentials.createInsecure(),
        });
  }
}
