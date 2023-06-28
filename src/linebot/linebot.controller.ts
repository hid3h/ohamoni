import {
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
  Res,
} from "@nestjs/common";
import { validateSignature } from "@line/bot-sdk";
import { Response } from "express";

@Controller("api/linebot")
export class LinebotController {
  @Post("webhook")
  webhook(
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

    console.log("result", result);

    res.status(HttpStatus.OK).send("OK");
  }
}
