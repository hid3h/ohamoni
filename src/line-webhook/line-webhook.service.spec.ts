import { Test, TestingModule } from "@nestjs/testing";
import { LineWebhookService } from "./line-webhook.service";

describe("LineWebhookService", () => {
  let service: LineWebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LineWebhookService],
    }).compile();

    service = module.get<LineWebhookService>(LineWebhookService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
