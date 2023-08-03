import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { LinebotModule } from "./linebot/linebot.module";
import { ConfigModule } from "@nestjs/config";
import { ReminderNotificationModule } from "./reminder-notification/reminder-notification.module";
import { GraphsModule } from "./graphs/graphs.module";

@Module({
  imports: [
    ConfigModule.forRoot(),
    LinebotModule,
    ReminderNotificationModule,
    GraphsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
