import { Module } from "@nestjs/common";
import { AccountsService } from "./accounts.service";
import { PrismaService } from "src/prisma/prisma.service";

@Module({
  providers: [AccountsService, PrismaService],
  exports: [AccountsService],
})
export class AccountsModule {}
