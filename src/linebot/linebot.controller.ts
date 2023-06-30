import {
  Controller,
  Headers,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
  Res,
} from "@nestjs/common";
import { validateSignature } from "@line/bot-sdk";
import { Response } from "express";
import { LinebotService } from "./linebot.service";

@Controller("api/linebot")
export class LinebotController {
  constructor(private readonly linebotService: LinebotService) {}

  @Post("webhook")
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers("x-line-signature") xLineSignature: string,
  ) {
    const rawBody = req.rawBody;

    const result = validateSignature(
      rawBody,
      process.env.LINE_CHANNEL_SECRET,
      xLineSignature,
    );

    const body = req.body;

    console.log("result", result);

    await this.linebotService.handleEvent(body);

    res.status(HttpStatus.OK).send("OK");
  }
}
