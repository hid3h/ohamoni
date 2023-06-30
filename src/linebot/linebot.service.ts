import { Client, WebhookRequestBody, MessageEvent } from "@line/bot-sdk";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class LinebotService {
  private readonly linebotClient: Client;

  constructor(private readonly prismaService: PrismaService) {
    this.linebotClient = new Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    });
  }

  async handleEvent(body: WebhookRequestBody) {
    const accounts = await this.prismaService.account.findMany();
    console.log("accounts", accounts);

    const events = body.events;
    console.log("events", events);
    if (events.length === 0) {
      return;
    }

    const event = events[0];
    if (event.type === "message") {
      const messageEvent = event as MessageEvent;
      const replyToken = messageEvent.replyToken;
      const message = messageEvent.message;
      if (message.type === "text") {
        const text = message.text;
        await this.linebotClient.replyMessage(replyToken, {
          type: "text",
          text: text,
        });
      }
    }
  }
}
