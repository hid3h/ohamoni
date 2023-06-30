import { Module } from "@nestjs/common";
import { LinebotController } from "./linebot.controller";
import { LinebotService } from "./linebot.service";
import { PrismaService } from "src/prisma/prisma.service";

@Module({
  controllers: [LinebotController],
  providers: [LinebotService, PrismaService],
})
export class LinebotModule {}
