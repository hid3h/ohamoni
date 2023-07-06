import { Client } from "@line/bot-sdk";
import { Injectable } from "@nestjs/common";
import { GettingUp } from "@prisma/client";
import { add, eachDayOfInterval, isSameDay, parse } from "date-fns";
import {
  format,
  formatInTimeZone,
  toDate,
  utcToZonedTime,
  zonedTimeToUtc,
} from "date-fns-tz";
import { ta } from "date-fns/locale";
import ja from "date-fns/locale/ja";
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
      accountId: account.id,
      fromDate: new Date(add(gotUpAt, { weeks: -1 })),
    });

    const gettingUpsOrderedByRegisteredAtDesc = gettingUps.sort((a, b) => {
      return b.registeredAt.getTime() - a.registeredAt.getTime();
    });

    const gettingUpMapByJSTDayISOString: Map<string, GettingUp | undefined> =
      new Map();
    for (let i = 0; i < 7; i++) {
      const targetDateUTC = add(new Date(), { days: -i });
      console.log("targetDateUTC", targetDateUTC);
      const targetDayJSTISOString = this.toJSTDayISOString(targetDateUTC);
      console.log("targetDayJSTISOString", targetDayJSTISOString);
      const gettingUp = gettingUpsOrderedByRegisteredAtDesc.find(
        (gettingUp) => {
          return (
            targetDayJSTISOString === this.toJSTDayISOString(gettingUp.gotUpAt)
          );
        },
      );
      console.log("gettingUp", gettingUp);
      if (gettingUp && !gettingUp.gettingUpDeletion) {
        gettingUpMapByJSTDayISOString[targetDayJSTISOString] = gettingUp;
      } else {
        gettingUpMapByJSTDayISOString[targetDayJSTISOString] = undefined;
      }
    }

    const sortedKeys = Object.keys(gettingUpMapByJSTDayISOString);
    console.log("sortedKeys", sortedKeys);
    const gettingUpRecordMessages = sortedKeys.map((key) => {
      const gettingUp = gettingUpMapByJSTDayISOString[key];
      return `${key} ${
        gettingUp ? this.toJSTTimeISOString(gettingUp.gotUpAt) : "なし"
      }`;
    });

    console.log(
      "format1",
      formatInTimeZone(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss zzz"),
    );

    await this.linebotClient.replyMessage(replyToken, {
      type: "text",
      text:
        "記録しました！\n直近一週間の記録です\n\n" +
        gettingUpRecordMessages.join("\n"),
    });
  }

  private async fetchGettingUpsFrom({
    accountId,
    fromDate,
  }: {
    accountId: string;
    fromDate: Date;
  }) {
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

    // const latestRegisterdGettingUpMapGroupedByGotUpDateInJST =
    //   gettingUps.reduce(
    //     (acc: Record<string, (typeof gettingUps)[number]>, g) => {
    //       const gotUpDateInJST = this.toJapanDateISOString(g.gotUpAt);
    //       if (acc[gotUpDateInJST]) {
    //         if (
    //           acc[gotUpDateInJST].registeredAt.getTime() <
    //           g.registeredAt.getTime()
    //         ) {
    //           acc[gotUpDateInJST] = g;
    //         }
    //       }
    //       if (!acc[gotUpDateInJST]) {
    //         acc[gotUpDateInJST] = g;
    //       }
    //       return acc;
    //     },
    //     {},
    //   );

    // const sortedKeys = Object.keys(
    //   latestRegisterdGettingUpMapGroupedByGotUpDateInJST,
    // ).sort();
    // return sortedKeys
    //   .map((key) => {
    //     return latestRegisterdGettingUpMapGroupedByGotUpDateInJST[key]
    //       .gettingUpDeletion
    //       ? undefined
    //       : latestRegisterdGettingUpMapGroupedByGotUpDateInJST[key];
    //   })
    //   .filter((g) => g);
  }

  private toJSTDayISOString(utcDate: Date) {
    const JSTISOString = utcDate.toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
    });
    return JSTISOString.split(" ")[0];
  }

  private toJSTTimeISOString(utcDate: Date) {
    const JSTISOString = utcDate.toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
    });
    return JSTISOString.split(" ")[1];
  }
}
