import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { LinebotModule } from "./linebot/linebot.module";

@Module({
  imports: [LinebotModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
