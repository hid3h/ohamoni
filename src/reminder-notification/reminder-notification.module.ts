import { Module } from "@nestjs/common";
import { ReminderNotificationService } from "./reminder-notification.service";
import { PrismaService } from "src/prisma/prisma.service";
import { AccountsModule } from "src/accounts/accounts.module";
import { ReminderNotificationController } from "./reminder-notification.controller";

@Module({
  controllers: [ReminderNotificationController],
  imports: [AccountsModule],
  providers: [ReminderNotificationService, PrismaService],
  exports: [ReminderNotificationService],
})
export class ReminderNotificationModule {}
