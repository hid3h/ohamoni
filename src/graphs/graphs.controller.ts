import { Controller, Get, Render } from "@nestjs/common";

@Controller("graphs")
export class GraphsController {
  @Get("/")
  @Render("graphs/show")
  async show() {
    console.log("show です！");
    return {
      LIFF_ID: process.env.LIFF_ID,
    };
  }
}
