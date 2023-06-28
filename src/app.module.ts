import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { LineWebhookModule } from "./line-webhook/line-webhook.module";

@Module({
  imports: [LineWebhookModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
