import { DateTimeFormatter, ZonedDateTime } from "@js-joda/core";
import { Client } from "@line/bot-sdk";
import { Injectable } from "@nestjs/common";
import { Account, GettingUp } from "@prisma/client";
import {
  add,
  differenceInDays,
  differenceInMilliseconds,
  startOfDay,
} from "date-fns";
import { formatInTimeZone, utcToZonedTime } from "date-fns-tz";
import { AccountsService } from "src/accounts/accounts.service";
import { PrismaService } from "src/prisma/prisma.service";

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

  async fetchWeekly({ lineUserId }: { lineUserId: string }) {
    // const labels = ["Red", "Blue", "Yellow", "Green", "Purple", "Orange", "Black"]
    // const data = {
    //   labels: labels,
    //   datasets: [{
    //     label: 'My First Dataset',
    //     data: [65, 59, 80, 81, 56, 55, 40],
    //     fill: false,
    //     borderColor: 'rgb(75, 192, 192)',
    //     tension: 0.1
    //   }]
    // };

    const account = await this.accountsService.findOrRegister({
      lineUserId,
    });

    const weekAgoDate = add(new Date(), { weeks: -1 });
    const fromDate = startOfDay(weekAgoDate);
    const gettingUps = await this.fetchGettingUpsByJSTDay({
      account,
      fromDate,
    });

    const labels = Object.keys(gettingUps);
    const data = labels.map((label) => {
      const gettingUp = gettingUps[label];
      if (!gettingUp) {
        return undefined;
      }
      const jstDate = utcToZonedTime(gettingUp.gotUpAt, "Asia/Tokyo");
      const startOfJstDate = startOfDay(jstDate);
      const diffInMs = differenceInMilliseconds(jstDate, startOfJstDate);

      return diffInMs;
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
    const gotUpAtZonedDateTime = ZonedDateTime.parse(gotUpAtStr);
    console.log("gotUpAtZonedDateTime", gotUpAtZonedDateTime);

    const account = await this.accountsService.findOrRegister({ lineUserId });

    await this.prismaService.gettingUp.create({
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

    await this.linebotClient.replyMessage(replyToken, {
      type: "text",
      text:
        "記録しました！\n直近一週間の記録です\n\n" +
        gettingUpRecordMessages.join("\n"),
    });
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
