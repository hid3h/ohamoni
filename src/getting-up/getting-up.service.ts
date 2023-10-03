import {
  DateTimeFormatter,
  Duration,
  Instant,
  LocalDateTime,
  Period,
  ZoneId,
  ZoneOffset,
  ZonedDateTime,
} from "@js-joda/core";
import { Client } from "@line/bot-sdk";
import { Injectable } from "@nestjs/common";
import { Account, GettingUp } from "@prisma/client";
import { add, differenceInDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { AccountsService } from "src/accounts/accounts.service";
import { PrismaService } from "src/prisma/prisma.service";
import "@js-joda/timezone";
import { Locale } from "@js-joda/locale";

@Injectable()
export class GettingUpService {
  private readonly linebotClient: Client;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly accountsService: AccountsService,
  ) {
    this.linebotClient = new Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    });
  }

  // getting_upsをgetting_up_daily_summariesに反映する
  async reflect() {
    const gettingUps = await this.prismaService.gettingUp.findMany({
      orderBy: {
        registeredAt: "asc",
      },
    });
    for (const gettingUp of gettingUps) {
      const gotUpAtDate = gettingUp.gotUpAt;
      const gotUpAtInstant = Instant.ofEpochMilli(gotUpAtDate.getTime()); // Instant オブジェクトに変換
      const gotUpAtZonedDateTime = LocalDateTime.ofInstant(
        gotUpAtInstant,
        ZoneId.of("Asia/Tokyo"),
      );
      const jstDate = gotUpAtZonedDateTime.format(
        DateTimeFormatter.ofPattern("yyyy-MM-dd"),
      );
      const jstTime = gotUpAtZonedDateTime.format(
        DateTimeFormatter.ofPattern("HH:mm"),
      );
      await this.prismaService.gettingUpDailySummary.upsert({
        where: {
          accountId_jstDate: { accountId: gettingUp.accountId, jstDate },
        },
        update: { jstTime },
        create: {
          jstDate,
          jstTime,
          account: {
            connect: {
              id: gettingUp.accountId,
            },
          },
        },
      });
    }
  }

  // 今日から1か月前のデータを取得する
  async fetchForGraph({ lineUserId }: { lineUserId: string }) {
    const account = await this.accountsService.findOrRegister({
      lineUserId,
    });

    // 日本時間のZoneIdを取得
    const japanZone = ZoneId.of("Asia/Tokyo");

    // 現在の日本時間を取得
    const nowInJapan = ZonedDateTime.now(japanZone);

    // 1か月前の日本時間を取得
    const oneMonthAgoInJapan = nowInJapan.minus(Period.ofMonths(1));

    // その日の始まりの日本時間を取得
    const startOfOneMonthAgoInJapan = oneMonthAgoInJapan
      .toLocalDate()
      .atStartOfDay(japanZone);

    // UTCに変換
    const oneMonthAgoInUTC = startOfOneMonthAgoInJapan.withZoneSameInstant(
      ZoneOffset.UTC,
    );

    // Date型に変換
    const oneMonthAgoInUTCDate = new Date(
      oneMonthAgoInUTC.toInstant().toEpochMilli(),
    );

    console.log(`Now in Japan: ${nowInJapan}`);
    console.log(`One month ago in Japan: ${oneMonthAgoInJapan}`);
    console.log(
      `Start of one month ago in Japan: ${startOfOneMonthAgoInJapan}`,
    );
    console.log(`One month ago in UTC: ${oneMonthAgoInUTC}`);
    console.log(`One month ago in UTC Date: ${oneMonthAgoInUTCDate}`);

    const gettingUps = await this.fetchGettingUpsByJSTDay({
      account,
      fromDate: oneMonthAgoInUTCDate,
    });

    const labels = Object.keys(gettingUps);
    const data = labels.map((label) => {
      const gettingUp = gettingUps[label];
      if (!gettingUp) {
        return undefined;
      }
      const gotUpAtDate = gettingUp.gotUpAt;
      const gotUpAtInstant = Instant.ofEpochMilli(gotUpAtDate.getTime()); // Instant オブジェクトに変換
      const gotUpAtInJapan = LocalDateTime.ofInstant(gotUpAtInstant, japanZone); // 日本時間に変換

      const startOfDayInJapan = gotUpAtInJapan
        .withHour(0)
        .withMinute(0)
        .withSecond(0)
        .withNano(0); // 日本時間でその日の始まり

      const duration = Duration.between(startOfDayInJapan, gotUpAtInJapan); // 経過時間を計算
      // 経過時間をミリ秒で取得して返す
      return duration.toMillis();
    });

    return {
      labels: labels.reverse().map((key) => {
        return this.replaceDayOfWeekWithJapanese(key.slice(3));
      }),
      data: data.reverse(),
    };
  }

  // datetime: '2023-07-03T20:58'
  async gettingUp({
    lineUserId,
    replyToken,
    datetimeInJST,
  }: {
    lineUserId: string;
    replyToken: string;
    datetimeInJST: string;
  }) {
    const gotUpAtStr = `${datetimeInJST}:00+09:00`;

    const account = await this.accountsService.findOrRegister({ lineUserId });

    await this.prismaService.$transaction(async (tx) => {
      await tx.gettingUp.create({
        data: {
          gotUpAt: gotUpAtStr,
          registeredAt: new Date(),
          account: {
            connect: {
              id: account.id,
            },
          },
        },
      });

      const jstDate = datetimeInJST.slice(0, 10);
      const jstTime = datetimeInJST.slice(11, 16);
      await tx.gettingUpDailySummary.upsert({
        where: {
          accountId_jstDate: { accountId: account.id, jstDate },
        },
        update: { jstTime },
        create: {
          jstDate,
          jstTime,
          account: {
            connect: {
              id: account.id,
            },
          },
        },
      });
    });

    const text = await this.buildGettingUpReplyText({
      account,
      gotUpAtStr,
    });

    await this.linebotClient.replyMessage(replyToken, {
      type: "text",
      text,
    });
  }

  private async buildGettingUpReplyText({
    account,
    gotUpAtStr,
  }: {
    account: Account;
    gotUpAtStr: string;
  }) {
    const gotUpAtZonedDateTime = ZonedDateTime.parse(gotUpAtStr);

    let text = "記録しました！";

    const formatterDate = DateTimeFormatter.ofPattern("MM/dd(E)").withLocale(
      Locale.US,
    );
    let formattedDate = formatterDate.format(gotUpAtZonedDateTime);
    formattedDate = this.replaceDayOfWeekWithJapanese(formattedDate);
    const formatterTime = DateTimeFormatter.ofPattern("HH:mm");
    const formattedTime = formatterTime.format(gotUpAtZonedDateTime);
    text = text + `\n${formattedDate}の起床時間は\n✨${formattedTime}⏱\nです`;

    const weekAgoGotUpAtZonedDateTime = gotUpAtZonedDateTime.minusWeeks(1);
    console.log("weekAgoGotUpAtZonedDateTime", weekAgoGotUpAtZonedDateTime);
    const weekAgoGotUpAtStr = weekAgoGotUpAtZonedDateTime.format(
      DateTimeFormatter.ISO_OFFSET_DATE_TIME,
    );
    console.log("weekAgoGotUpAtStr", weekAgoGotUpAtStr);
    const weekAgoGotUpAt = new Date(weekAgoGotUpAtStr);
    console.log("weekAgoGotUpAt", weekAgoGotUpAt);

    const gettingUps = await this.fetchGettingUpsFrom({
      account,
      fromDate: weekAgoGotUpAt,
    });

    const gettingUpsOrderedByRegisteredAtDesc = gettingUps.sort((a, b) => {
      return b.registeredAt.getTime() - a.registeredAt.getTime();
    });

    const gettingUpMapByJSTDayISOString: Map<string, GettingUp | undefined> =
      new Map();
    for (let i = 0; i < 7; i++) {
      const targetDateUTC = add(new Date(), { days: -i });
      const targetDayJSTISOString = formatInTimeZone(
        targetDateUTC,
        "Asia/Tokyo",
        "MM/dd(E)",
      );
      const gettingUp = gettingUpsOrderedByRegisteredAtDesc.find(
        (gettingUp) => {
          return (
            targetDayJSTISOString ===
            formatInTimeZone(gettingUp.gotUpAt, "Asia/Tokyo", "MM/dd(E)")
          );
        },
      );

      if (gettingUp && !gettingUp.gettingUpDeletion) {
        gettingUpMapByJSTDayISOString[targetDayJSTISOString] = gettingUp;
      } else {
        gettingUpMapByJSTDayISOString[targetDayJSTISOString] = undefined;
      }
    }

    const sortedKeys = Object.keys(gettingUpMapByJSTDayISOString);
    const gettingUpRecordMessages = sortedKeys.map((key) => {
      const gettingUp = gettingUpMapByJSTDayISOString[key];
      return `${this.replaceDayOfWeekWithJapanese(key)} ${
        gettingUp
          ? formatInTimeZone(gettingUp.gotUpAt, "Asia/Tokyo", "HH:mm")
          : "なし"
      }`;
    });

    text =
      text +
      "\n\n過去1週間の記録はこちらです\n" +
      gettingUpRecordMessages.join("\n");

    return text;
  }

  private async fetchGettingUpsByJSTDay({
    account,
    fromDate,
    toDate,
  }: {
    account: Pick<Account, "id">;
    fromDate: Date;
    toDate?: Date;
  }) {
    const accountId = account.id;

    const now = new Date();
    console.log("now", now);
    const endDateOfJSTTodayString = formatInTimeZone(
      now,
      "Asia/Tokyo",
      "yyyy-MM-dd'T'14:59:59.999'Z'",
    );
    console.log("endDateOfJSTTodayString", endDateOfJSTTodayString);
    const endDate = toDate ?? new Date(endDateOfJSTTodayString);
    console.log("endDate", endDate);
    const gettingUps = await this.prismaService.gettingUp.findMany({
      where: {
        accountId,
        gotUpAt: {
          gte: fromDate,
          lte: endDate,
        },
      },
      include: {
        gettingUpDeletion: true,
      },
      orderBy: {
        registeredAt: "desc",
      },
    });

    const gettingUpsWithJSTString = gettingUps.map((gettingUp) => {
      return {
        ...gettingUp,
        gotUpDayJSTString: formatInTimeZone(
          gettingUp.gotUpAt,
          "Asia/Tokyo",
          "MM/dd(E)",
        ),
      };
    });

    const gettingUpMapByJSTDay = new Map<
      string,
      (typeof gettingUpsWithJSTString)[0]
    >();
    const count = differenceInDays(endDate, fromDate);
    for (let i = 0; i < count; i++) {
      const targetDateUTC = add(endDate, { days: -i });
      console.log("targetDateUTC", targetDateUTC);
      const targetDayJSTISOString = formatInTimeZone(
        targetDateUTC,
        "Asia/Tokyo",
        "MM/dd(E)",
      );
      console.log("targetDayJSTISOString", targetDayJSTISOString);
      const gettingUp = gettingUpsWithJSTString.find((gettingUp) => {
        return targetDayJSTISOString === gettingUp.gotUpDayJSTString;
      });

      if (gettingUp && !gettingUp.gettingUpDeletion) {
        gettingUpMapByJSTDay[targetDayJSTISOString] = gettingUp;
      } else {
        gettingUpMapByJSTDay[targetDayJSTISOString] = undefined;
      }
    }

    return gettingUpMapByJSTDay;
  }

  private async fetchGettingUpsFrom({
    account,
    fromDate,
  }: {
    account: Pick<Account, "id">;
    fromDate: Date;
  }) {
    const accountId = account.id;
    return await this.prismaService.gettingUp.findMany({
      where: {
        accountId,
        gotUpAt: {
          gte: fromDate,
        },
      },
      include: {
        gettingUpDeletion: true,
      },
    });
  }

  private replaceDayOfWeekWithJapanese(str) {
    const daysOfWeek = {
      Sun: "日",
      Mon: "月",
      Tue: "火",
      Wed: "水",
      Thu: "木",
      Fri: "金",
      Sat: "土",
    };

    let replacedStr = str;

    for (const day in daysOfWeek) {
      const regex = new RegExp(day, "g");
      replacedStr = replacedStr.replace(regex, daysOfWeek[day]);
    }

    return replacedStr;
  }
}
