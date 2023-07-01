import { Module } from "@nestjs/common";
import { GettingUpService } from "./getting-up.service";
import { PrismaService } from "src/prisma/prisma.service";
import { AccountsModule } from "src/accounts/accounts.module";

@Module({
  imports: [AccountsModule],
  providers: [GettingUpService, PrismaService],
  exports: [GettingUpService],
})
export class GettingUpModule {}
