import { Controller, Get, Query } from "@nestjs/common";
import { GettingUpService } from "./getting-up.service";
import { OAuth } from "@line/bot-sdk";
import axios from "axios";

@Controller("/api/getting-ups")
export class GettingUpController {
  private readonly lineOauthClient: OAuth;

  constructor(private readonly gettingUpService: GettingUpService) {
    this.lineOauthClient = new OAuth();
  }

  @Get("/")
  async fetchWeekly(@Query("lineIdToken") lineIdToken: string) {
    const lineClientId = process.env.LIFF_CHANNEL_ID;
    // なぜかここで400エラーになりますので、axiosで代用します。
    // const paylaod = await this.lineOauthClient.verifyIdToken(
    //   lineIdToken,
    //   lineClientId,
    // );
    const url = "https://api.line.me/oauth2/v2.1/verify";
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    const data = new URLSearchParams({
      id_token: lineIdToken,
      client_id: lineClientId,
    });
    const result = await axios.post(url, data, { headers });
    const lineUserId = result.data.sub;

    const graphData = await this.gettingUpService.fetchForGraph({ lineUserId });

    return graphData;
  }

  @Get("/reflect")
  async reflect() {
    console.log("reflect start");
    await this.gettingUpService.reflect();
    console.log("reflect end");
  }
}
