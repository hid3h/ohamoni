import { Client } from "@line/bot-sdk";
import { Injectable } from "@nestjs/common";
import { Account, GettingUp } from "@prisma/client";
import {
  add,
  differenceInDays,
  differenceInMilliseconds,
  endOfDay,
  startOfDay,
} from "date-fns";
import { formatInTimeZone, toDate, utcToZonedTime } from "date-fns-tz";
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
    console.log("labels", labels);
    const data = labels.map((label) => {
      const gettingUp = gettingUps[label];
      if (!gettingUp) {
        return undefined;
      }
      console.log("gettingUp.gotUpAt", gettingUp.gotUpAt);
      const jstDate = utcToZonedTime(gettingUp.gotUpAt, "Asia/Tokyo");
      console.log("jstDate", jstDate);
      const startOfJstDate = startOfDay(jstDate);
      console.log("startOfJstDate", startOfJstDate);
      const diffInMs = differenceInMilliseconds(jstDate, startOfJstDate);
      console.log("diffInMs", diffInMs);
      return diffInMs;
    });

    return {
      labels: labels.reverse(),
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
    // console.log("datetimeInJST", datetimeInJST);
    // const gotUpAtJST = new Date(datetimeInJST);
    // console.log("gotUpAtJST", gotUpAtJST);
    // const gotUpAtUTC = parse(datetimeInJST, "yyyy-MM-dd'T'HH:mm", new Date());
    // console.log("gotUpAtUTC", gotUpAtUTC);
    // ローカル(タイムゾーン日本)
    // datetimeInJST 2023-07-06T20:56
    // gotUpAtJST 2023-07-06T11:56:00.000Z
    // gotUpAtUTC 2023-07-06T11:56:00.000Z

    // Cloud Run(タイムゾーンUTC)
    // datetimeInJST 2023-07-06T21:05
    // gotUpAtJST 2023-07-06T21:05:00.000Z
    // gotUpAtUTC 2023-07-06T21:05:00.000Z
    // console.log("toDate1", toDate(datetimeInJST, { timeZone: "Asia/Tokyo" }));
    // console.log("toDate2", toDate(datetimeInJST, { timeZone: "UTC" }));
    // console.log("toDate3", toDate(datetimeInJST));
    // タイムゾーン日本
    // toDate1 2023-07-06T12:20:00.000Z
    // toDate2 2023-07-06T21:20:00.000Z
    // toDate3 2023-07-06T12:20:00.000Z

    // タイムゾーンUTC
    // toDate1 2023-07-06T12:27:00.000Z
    // toDate2 2023-07-06T21:27:00.000Z
    // toDate3 2023-07-06T21:27:00.000Z

    const gotUpAt = toDate(datetimeInJST, { timeZone: "Asia/Tokyo" });

    const account = await this.accountsService.findOrRegister({ lineUserId });

    await this.prismaService.gettingUp.create({
      data: {
        gotUpAt: gotUpAt,
        registeredAt: new Date(),
        account: {
          connect: {
            id: account.id,
          },
        },
      },
    });

    const gettingUps = await this.fetchGettingUpsFrom({
      account,
      fromDate: new Date(add(gotUpAt, { weeks: -1 })),
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
      return `${key} ${
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
    const endDate = toDate ?? endOfDay(new Date());
    console.log("endDate", endDate);
    const gettingUps = await this.prismaService.gettingUp.findMany({
      where: {
        accountId,
        gotUpAt: {
          gte: fromDate,
          lt: endDate,
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
        gotUpAtJSTString: formatInTimeZone(
          gettingUp.gotUpAt,
          "Asia/Tokyo",
          "yyyy-MM-dd'T'HH:mm",
        ),
        gotUpDayJSTString: formatInTimeZone(
          gettingUp.gotUpAt,
          "Asia/Tokyo",
          "MM/dd(E)",
        ),
      };
    });
    console.log("gettingUpsWithJSTString", gettingUpsWithJSTString);

    const gettingUpMapByJSTDay = new Map<
      string,
      (typeof gettingUpsWithJSTString)[0]
    >();
    const count = differenceInDays(endDate, fromDate);
    console.log("count", count);
    for (let i = 0; i < count; i++) {
      const targetDateUTC = add(endDate, { days: -i });
      console.log("targetDateUTC", targetDateUTC);
      const targetDayJSTISOString = formatInTimeZone(
        targetDateUTC,
        "Asia/Tokyo",
        "MM/dd(E)",
      );
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
}
