import { Module } from "@nestjs/common";
import { LineWebhookController } from "./line-webhook.controller";
import { LineWebhookService } from "./line-webhook.service";

@Module({
  controllers: [LineWebhookController],
  providers: [LineWebhookService],
})
export class LineWebhookModule {}
