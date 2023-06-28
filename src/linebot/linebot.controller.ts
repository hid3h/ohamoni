import { Controller, Get, Post } from "@nestjs/common";

@Controller("api/linebot")
export class LinebotController {
  @Post("webhook")
  webhook() {
    return "Hello World!";
  }
}
