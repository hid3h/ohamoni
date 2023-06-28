import { Test, TestingModule } from "@nestjs/testing";
import { LineWebhookController } from "./line-webhook.controller";

describe("LineWebhookController", () => {
  let controller: LineWebhookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LineWebhookController],
    }).compile();

    controller = module.get<LineWebhookController>(LineWebhookController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
