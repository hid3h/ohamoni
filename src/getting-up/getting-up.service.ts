import { Client } from "@line/bot-sdk";
import { Injectable } from "@nestjs/common";
import { add, parse } from "date-fns";
import { format, utcToZonedTime } from "date-fns-tz";
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
    const gotUpAt = parse(datetimeInJST, "yyyy-MM-dd'T'HH:mm", new Date());
    console.log("gotUpAt", gotUpAt);

    const account = await this.accountsService.findOrRegister({ lineUserId });

    await this.prismaService.gettingUp.create({
      data: {
        gotUpAt,
        registeredAt: new Date(),
        account: {
          connect: {
            id: account.id,
          },
        },
      },
    });

    const gettingUps = await this.fetchGettingUpsByDateFrom({
      accountId: account.id,
      fromDate: new Date(add(gotUpAt, { weeks: -1 })),
    });

    const gettingUpRecordMessages = gettingUps.map((g) => {
      const gotUpAtInJST = utcToZonedTime(g.gotUpAt, "Asia/Tokyo");
      return format(gotUpAtInJST, "MM/dd(E) HH:mm", { timeZone: "Asia/Tokyo" });
    });

    await this.linebotClient.replyMessage(replyToken, {
      type: "text",
      text:
        "記録しました！\n直近一週間の記録です\n\n" +
        gettingUpRecordMessages.join("\n"),
    });
  }

  private async fetchGettingUpsByDateFrom({
    accountId,
    fromDate,
  }: {
    accountId: string;
    fromDate: Date;
  }) {
    const gettingUps = await this.prismaService.gettingUp.findMany({
      where: {
        accountId,
        gotUpAt: {
          gte: fromDate,
        },
      },
      orderBy: {
        gotUpAt: "asc",
      },
      include: {
        gettingUpDeletion: true,
      },
    });

    const latestRegisterdGettingUpMapGroupedByGotUpDateInJST =
      gettingUps.reduce(
        (acc: Record<string, (typeof gettingUps)[number]>, g) => {
          const gotUpDateInJST = this.toJapanDateISOString(g.gotUpAt);
          if (acc[gotUpDateInJST]) {
            if (
              acc[gotUpDateInJST].registeredAt.getTime() <
              g.registeredAt.getTime()
            ) {
              acc[gotUpDateInJST] = g;
            }
          }
          if (!acc[gotUpDateInJST]) {
            acc[gotUpDateInJST] = g;
          }
          return acc;
        },
        {},
      );

    const sortedKeys = Object.keys(
      latestRegisterdGettingUpMapGroupedByGotUpDateInJST,
    ).sort();
    return sortedKeys
      .map((key) => {
        return latestRegisterdGettingUpMapGroupedByGotUpDateInJST[key]
          .gettingUpDeletion
          ? undefined
          : latestRegisterdGettingUpMapGroupedByGotUpDateInJST[key];
      })
      .filter((g) => g);
  }

  private toJapanDateISOString(date) {
    return format(date, "yyyy-MM-dd", { timeZone: "Asia/Tokyo" });
  }
}
