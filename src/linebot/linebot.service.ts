import { WebhookRequestBody } from "@line/bot-sdk";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class LinebotService {
  constructor(private readonly prismaService: PrismaService) {}

  async handleEvent(body: WebhookRequestBody) {
    const accounts = await this.prismaService.account.findMany();
    console.log("accounts", accounts);

    const events = body.events;
    console.log("events", events);
    if (events.length === 0) {
      return;
    }
  }
}
