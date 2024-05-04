import {
  ChronoField,
  DateTimeFormatter,
  LocalTime,
  Period,
  ZoneId,
  ZonedDateTime,
} from "@js-joda/core";
import { Client } from "@line/bot-sdk";
import { Injectable } from "@nestjs/common";
import { Account } from "@prisma/client";
import { AccountsService } from "src/accounts/accounts.service";
import { PrismaService } from "src/prisma/prisma.service";
import "@js-joda/timezone";
import { Locale } from "@js-joda/locale";
import OpenAI from "openai";

@Injectable()
export class GettingUpService {
  private readonly linebotClient: Client;
  private readonly openai: OpenAI;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly accountsService: AccountsService,
  ) {
    this.linebotClient = new Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    });
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
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
    const jstDate = oneMonthAgoInJapan.format(DateTimeFormatter.ISO_LOCAL_DATE);
    const gettingUps = await this.prismaService.gettingUpDailySummary.findMany({
      where: {
        accountId: account.id,
        jstDate: {
          gte: jstDate,
        },
      },
    });

    const labels = [];
    const data = [];
    // 1ヶ月分を一旦31で固定
    for (let i = 0; i < 31; i++) {
      const targetZonedDateTime = oneMonthAgoInJapan.plusDays(i);

      const targetJstDate = targetZonedDateTime.format(
        DateTimeFormatter.ISO_LOCAL_DATE,
      );
      const targetGettingUp = gettingUps.find((gettingUp) => {
        return gettingUp.jstDate === targetJstDate;
      });

      labels.push(
        targetZonedDateTime.format(
          DateTimeFormatter.ofPattern("dd(E)").withLocale(Locale.JAPAN),
        ),
      );
      const gettingUpSeconds = targetGettingUp
        ? LocalTime.parse(targetGettingUp.jstTime).get(
            ChronoField.SECOND_OF_DAY,
          )
        : undefined;
      data.push(gettingUpSeconds);
    }

    return {
      labels,
      data,
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
      gotUpAtStr,
    });

    // ユーザーに返信をなる早で一旦返したいので、ここで返信しておく
    await this.linebotClient.replyMessage(replyToken, {
      type: "text",
      text,
    });

    await this.pushAdditionalMessage({
      gotUpAtStr,
      account,
    });
  }

  private async pushAdditionalMessage({
    gotUpAtStr,
    account,
  }: {
    gotUpAtStr: string;
    account: Account;
  }) {
    // 記録日時が今日じゃなかったら過去分を返す必要はない
    const nowZonedDateTime = ZonedDateTime.now(ZoneId.of("Asia/Tokyo"));
    const gotUpAtZonedDateTime = ZonedDateTime.parse(gotUpAtStr);
    if (
      !nowZonedDateTime.toLocalDate().equals(gotUpAtZonedDateTime.toLocalDate())
    ) {
      return;
    }

    const weekAgoGotUpAtZonedDateTime = gotUpAtZonedDateTime.minusWeeks(1);
    const weekAgoJstDate = weekAgoGotUpAtZonedDateTime.format(
      DateTimeFormatter.ISO_LOCAL_DATE,
    );
    const gettingUpsFromWeekAgo =
      await this.prismaService.gettingUpDailySummary.findMany({
        where: {
          accountId: account.id,
          jstDate: {
            gte: weekAgoJstDate,
          },
        },
        orderBy: {
          jstDate: "desc",
        },
      });

    const gettingUpRecordMessages = [];
    for (let i = 0; i < 7; i++) {
      const targetZonedDatetime = nowZonedDateTime.minusDays(i);
      const targetJstDate = targetZonedDatetime.format(
        DateTimeFormatter.ISO_LOCAL_DATE,
      );
      const targetGettingUp = gettingUpsFromWeekAgo.find((gettingUp) => {
        return gettingUp.jstDate === targetJstDate;
      });
      const gettingUpDateForMessage = targetZonedDatetime.format(
        DateTimeFormatter.ofPattern("MM/dd(E)").withLocale(Locale.JAPAN),
      );
      const gettingUpTimeForMessage = targetGettingUp
        ? targetGettingUp.jstTime
        : "なし";
      const gettingUpDateTimeForMessage =
        gettingUpDateForMessage + " " + gettingUpTimeForMessage;
      gettingUpRecordMessages.push(gettingUpDateTimeForMessage);
    }

    const lineUserId = account.lineUserId;

    // openaiのAPIを叩く
    let result;
    try {
      const prompt = `あなたは起床時間記録アプリです。早起きしたい人や目標の起床時間に近づけたい人が使うアプリです。\n
      ユーザーが本日の起床時間を記録したので、その記録を分析して、ユーザーにアドバイスを投げかけてください。\n
      直近一週間の記録は以下です。\n\n
      ${gettingUpRecordMessages.join("\n")}\n

      以下に従ってください。\n
      - 70字程度
      - 記録が少ない場合は記録し始めの場合があるのでアプリを使ってくれていることに感謝の気持ちを伝えてください
      - 今日を除く記録が２つ以上ある場合は前日までの平均起床時間を算出して、本日の起床時間と比較・分析してください
      `;
      console.log("openai.chat.completions prompt", prompt);
      result = await this.openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: prompt,
          },
        ],
        model: "gpt-4",
      });
      console.log("openai.chat.completions result", result);
      console.log(
        "openai.chat.completions result.choices[0].message",
        result.choices[0].message,
      );
    } catch (e) {
      console.error(
        `error openai.chat.completions.create. lineUserId: ${lineUserId}`,
        e,
      );
    }
    const openaiMessageContent = result
      ? result.choices[0].message.content
      : null;
    const text = `直近1週間の起床時間の記録です\n
${gettingUpRecordMessages.join("\n")}\n
${openaiMessageContent}`;

    try {
      await this.linebotClient.pushMessage(lineUserId, {
        type: "text",
        text,
      });
    } catch (e) {
      console.error(
        `failed to push additional message. lieUserId: ${lineUserId}`,
        e,
      );
    }
  }

  private async buildGettingUpReplyText({
    gotUpAtStr,
  }: {
    gotUpAtStr: string;
  }) {
    const gotUpAtZonedDateTime = ZonedDateTime.parse(gotUpAtStr);
    const formattedDate = gotUpAtZonedDateTime.format(
      DateTimeFormatter.ofPattern("MM/dd(E)").withLocale(Locale.JAPAN),
    );
    const formattedTime = gotUpAtZonedDateTime.format(
      DateTimeFormatter.ofPattern("HH:mm"),
    );
    return (
      "記録しました！" +
      `\n\n${formattedDate}の起床時間は\n✨${formattedTime}⏱\nです`
    );
  }
}
