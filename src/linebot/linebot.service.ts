import { WebhookRequestBody, MessageEvent } from "@line/bot-sdk";
import { Injectable } from "@nestjs/common";
import { GettingUpService } from "src/getting-up/getting-up.service";

@Injectable()
export class LinebotService {
  constructor(private readonly gettingUpService: GettingUpService) {}

  async handleEvent(body: WebhookRequestBody) {
    const events = body.events;
    if (events.length === 0) {
      return;
    }

    const event = events[0];
    if (event.type === "message") {
      const messageEvent = event as MessageEvent;
      const message = messageEvent.message;
      if (message.type === "text") {
        const text = message.text;
        if (text === "起きた") {
          await this.gettingUpService.gettingUpNow({
            lineUserId: messageEvent.source.userId,
            gotUpTimestamp: messageEvent.timestamp,
            replyToken: messageEvent.replyToken,
          });
        }
      }
    }
  }
}
