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

    console.log("gettingUps", gettingUps);
    const gettingUpRecordMessages = gettingUps.map((g) => {
      if (!g) {
        return undefined;
      }
      const gotUpAtInJST = this.toJapanDateISOString(g.gotUpAt);
      return `${gotUpAtInJST} ${g.gotUpAt.getHours()}:${g.gotUpAt.getMinutes()}`;
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

    console.log(
      "latestRegisterdGettingUpMapGroupedByGotUpDateInJST",
      latestRegisterdGettingUpMapGroupedByGotUpDateInJST,
    );

    const sortedKeys = Object.keys(
      latestRegisterdGettingUpMapGroupedByGotUpDateInJST,
    ).sort();
    return sortedKeys.map((key) => {
      return latestRegisterdGettingUpMapGroupedByGotUpDateInJST[key]
        .gettingUpDeletion
        ? undefined
        : latestRegisterdGettingUpMapGroupedByGotUpDateInJST[key];
    });
  }

  private toJapanDateISOString(date) {
    return new Date(date.getTime() + 9 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
  }
}
