import {
  Body,
  Controller,
  Headers,
  HttpStatus,
  Post,
  Res,
} from "@nestjs/common";
import { Response } from "express";

@Controller("api/reminder-notifications")
export class ReminderNotificationController {
  @Post("/")
  async notice(@Body() body: Body, @Headers() Headers, @Res() res: Response) {
    console.log("body", body);
    console.log("Headers", Headers);
    res.status(HttpStatus.OK).send("OK");
  }
}
