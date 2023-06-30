import { Client, WebhookRequestBody } from "@line/bot-sdk";
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
  }
}
