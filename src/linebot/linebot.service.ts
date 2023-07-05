import { WebhookRequestBody, MessageEvent, Client } from "@line/bot-sdk";
import { Injectable } from "@nestjs/common";
import { parse } from "date-fns";
import { GettingUpService } from "src/getting-up/getting-up.service";

@Injectable()
export class LinebotService {
  private readonly linebotClient: Client;

  private readonly gotUpActionData: string = "got_up";

  constructor(private readonly gettingUpService: GettingUpService) {
    this.linebotClient = new Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    });
  }

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
        if (text === "記録") {
          await this.linebotClient.replyMessage(messageEvent.replyToken, {
            type: "template",
            altText: "起きた時間を教えてください",
            template: {
              type: "buttons",
              text: "起きた時間を教えてください",
              actions: [
                {
                  type: "datetimepicker",
                  label: "日時を選択する",
                  mode: "datetime",
                  data: this.gotUpActionData,
                },
              ],
            },
          });
        }
      }
    } else if (event.type === "postback") {
      const postback = event.postback;
      if (postback.data === this.gotUpActionData) {
        // Property 'datetime' does not exist on type 'DateTimePostback | RichMenuSwitchPostback'.
        // Property 'datetime' does not exist on type 'RichMenuSwitchPostback'ねえ
        // const datetimeInJST = params.datetime;
        const params = postback.params as { datetime: string };
        const datetimeInJST = params.datetime;
        await this.gettingUpService.gettingUp({
          lineUserId: event.source.userId,
          datetimeInJST,
          replyToken: event.replyToken,
        });
      }
    }
  }
}
