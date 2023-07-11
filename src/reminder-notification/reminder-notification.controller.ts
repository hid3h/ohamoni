import { Body, Controller, Get, HttpStatus, Post, Res } from "@nestjs/common";
import { Response } from "express";

@Controller("api/reminder-notifications")
export class ReminderNotificationController {
  // constructor(private readonly linebotService: LinebotService) {}

  @Post("/")
  async notice(@Body() body: Body, @Res() res: Response) {
    console.log("body", body);
    res.status(HttpStatus.OK).send("OK");
  }

  @Get("/")
  async noticeG(@Body() body: Body, @Res() res: Response) {
    console.log("body", body);
    res.status(HttpStatus.OK).send("OK");
  }
}
