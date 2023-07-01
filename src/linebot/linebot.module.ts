import { Module } from "@nestjs/common";
import { LinebotController } from "./linebot.controller";
import { LinebotService } from "./linebot.service";
import { GettingUpModule } from "src/getting-up/getting-up.module";

@Module({
  imports: [GettingUpModule],
  controllers: [LinebotController],
  providers: [LinebotService],
})
export class LinebotModule {}
