import {
  Body,
  Controller,
  Headers,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
  Res,
} from "@nestjs/common";
import { WebhookRequestBody, validateSignature } from "@line/bot-sdk";
import { Response } from "express";
import { LinebotService } from "./linebot.service";

@Controller("api/linebot")
export class LinebotController {
  constructor(private readonly linebotService: LinebotService) {}

  @Post("webhook")
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: WebhookRequestBody,
    @Res() res: Response,
    @Headers("x-line-signature") xLineSignature: string,
  ) {
    const rawBody = req.rawBody;

    const isVaildSinature = validateSignature(
      rawBody,
      process.env.LINE_CHANNEL_SECRET,
      xLineSignature,
    );

    if (isVaildSinature) {
      await this.linebotService.handleEvent(body);
    }

    res.status(HttpStatus.OK).send("OK");
  }
}
