import { Module } from "@nestjs/common";
import { LinebotController } from "./linebot.controller";
import { LinebotService } from "./linebot.service";
import { GettingUpModule } from "src/getting-up/getting-up.module";
import { ReminderNotificationModule } from "src/reminder-notification/reminder-notification.module";

@Module({
  imports: [GettingUpModule, ReminderNotificationModule],
  controllers: [LinebotController],
  providers: [LinebotService],
})
export class LinebotModule {}
