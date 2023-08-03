import { Controller, Get, Query } from "@nestjs/common";
import { GettingUpService } from "./getting-up.service";
import { OAuth } from "@line/bot-sdk";

@Controller("/api/getting-ups")
export class GettingUpController {
  private readonly lineOauthClient: OAuth;

  constructor(private readonly gettingUpService: GettingUpService) {
    this.lineOauthClient = new OAuth();
  }

  @Get("/")
  async fetchWeekly(@Query("lineIdToken") lineIdToken: string) {
    console.log("showAPIです！", lineIdToken);
    const lineClientId = process.env.LIFF_CHANNEL_ID;
    console.log("lineClientId", lineClientId);
    // TODO: なぜかここで400エラーになります
    const paylaod = await this.lineOauthClient.verifyIdToken(
      lineIdToken,
      lineClientId,
    );
    console.log("paylaod", paylaod);
  }
}
