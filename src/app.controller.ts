import { Controller, Get, Render } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  getHello() {
    console.log("health check");
    return {
      message: "Hello World!",
    };
  }
}
