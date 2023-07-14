import { Body, Controller, HttpStatus, Post, Res } from "@nestjs/common";
import { Response } from "express";
import { ReminderNotificationService } from "./reminder-notification.service";

@Controller("api/reminder-notifications")
export class ReminderNotificationController {
  constructor(
    private readonly reminderNotificationService: ReminderNotificationService,
  ) {}

  @Post("/")
  async notice(@Body() body, @Res() res: Response) {
    // reminderNotificationSettingIdを特定できることで、内部からのリクエストであることを保証する
    await this.reminderNotificationService.notice({
      reminderNotificationSettingId: body.reminderNotificationSettingId,
    });
    res.status(HttpStatus.OK).send("OK");
  }
}
