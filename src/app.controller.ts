import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get("/health")
  getHello() {
    return {
      message: "Hello World!",
    };
  }
}
