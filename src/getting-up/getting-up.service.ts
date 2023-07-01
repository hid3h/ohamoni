import { Client } from "@line/bot-sdk";
import { Injectable } from "@nestjs/common";
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

  async gettingUpNow({
    lineUserId,
    gotUpTimestamp,
    replyToken,
  }: {
    lineUserId: string;
    gotUpTimestamp: number;
    replyToken: string;
  }) {
    await this.linebotClient.replyMessage(replyToken, {
      type: "text",
      text: "おはようございます！",
    });

    const account = await this.accountsService.findOrRegister({ lineUserId });
    const gotUpAt = new Date(gotUpTimestamp);

    await this.prismaService.gettingUp.create({
      data: {
        gotUpAt,
        registeredAt: gotUpAt,
        account: {
          connect: {
            id: account.id,
          },
        },
      },
    });

    const gettingUps = await this.fetchGettingUpsByDateFrom({
      accountId: account.id,
      fromDate: new Date(gotUpAt.getTime() - 7 * 24 * 60 * 60 * 1000),
    });

    const gettingUpRecordMessages = gettingUps.map((g) => {
      const gotUpAt = g.gotUpAt;
      const days = this.getDays(gotUpAt.getDay());
      const month = "0" + (gotUpAt.getMonth() + 1); // JavaScriptの月は0から始まるため1を足しています。
      const day = ("0" + gotUpAt.getDate()).slice(-2);
      const hours = ("0" + gotUpAt.getHours()).slice(-2);
      const minutes = ("0" + gotUpAt.getMinutes()).slice(-2);
      return `${month}/${day}(${days}) ${hours}:${minutes}`;
    });
    console.log("gettingUpRecordMessages", gettingUpRecordMessages);
    await this.linebotClient.pushMessage(lineUserId, {
      type: "text",
      text: gettingUpRecordMessages.join("\n"),
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
    return this.toJapanDatetime(date).toISOString().split("T")[0];
  }

  private toJapanDatetime(date) {
    return new Date(date.getTime() + 9 * 60 * 60 * 1000);
  }

  private getDays(i: number) {
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return days[i];
  }
}
