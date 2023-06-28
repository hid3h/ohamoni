import { Module } from "@nestjs/common";
import { LinebotController } from "./linebot.controller";
import { LinebotService } from "./linebot.service";

@Module({
  controllers: [LinebotController],
  providers: [LinebotService],
})
export class LinebotModule {}
