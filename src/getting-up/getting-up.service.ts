import { Client } from "@line/bot-sdk";
import { Injectable } from "@nestjs/common";
import { GettingUp } from "@prisma/client";
import { add, eachDayOfInterval, isSameDay, parse } from "date-fns";
import { format, utcToZonedTime, zonedTimeToUtc } from "date-fns-tz";
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
    const gotUpAtUTC = parse(datetimeInJST, "yyyy-MM-dd'T'HH:mm", new Date());
    console.log("gotUpAtUTC", gotUpAtUTC);

    const account = await this.accountsService.findOrRegister({ lineUserId });

    await this.prismaService.gettingUp.create({
      data: {
        gotUpAt: gotUpAtUTC,
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
      fromDate: new Date(add(gotUpAtUTC, { weeks: -1 })),
    });

    const gettingUpsOrderedByRegisteredAtDesc = gettingUps.sort((a, b) => {
      return b.registeredAt.getTime() - a.registeredAt.getTime();
    });

    const gettingUpMapByDateJSTString: Map<string, GettingUp | undefined> =
      new Map();

    for (let i = 0; i < 7; i++) {
      const targetDateUTC = add(new Date(), { days: -i });
      console.log("targetDateUTC", targetDateUTC);
      const targetDateJSTISOString = this.toJSTISOString(targetDateUTC);
      console.log("targetDateJSTISOString", targetDateJSTISOString)
      // const targetDateJSTString = format(targetDatetUTC, "MM/dd(E)", {
      //   locale: ja,
      // });
      // console.log(
      //   "targetDateJSTString これは日本時間ならok",
      //   targetDateJSTString,
      // );
      // const gettingUp = gettingUps.find((gettingUp) => {
      //   return isSameDay(targetDatetUTC, gettingUp.gotUpAt);
      // });
      // if (gettingUp) {
      //   hoge[targetDateJSTString] = gettingUp;
      // } else {
      //   const day = format(targetDateJSTString, "MM/dd(E)", {
      //     timeZone: "Asia/Tokyo",
      //   });
      //   gettingUpRecordMessages.push(`${day} なし`);
      // }
    }

    // await this.linebotClient.replyMessage(replyToken, {
    //   type: "text",
    //   text:
    //     "記録しました！\n直近一週間の記録です\n\n" +
    //     gettingUpRecordMessages.join("\n"),
    // });
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

  private toJSTISOString(utcDate: Date) {
    return utcDate.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  }
}
