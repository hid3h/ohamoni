import { Module } from "@nestjs/common";
import { ReminderNotificationService } from "./reminder-notification.service";
import { PrismaService } from "src/prisma/prisma.service";
import { AccountsModule } from "src/accounts/accounts.module";

@Module({
  imports: [AccountsModule],
  providers: [ReminderNotificationService, PrismaService],
  exports: [ReminderNotificationService],
})
export class ReminderNotificationModule {}
