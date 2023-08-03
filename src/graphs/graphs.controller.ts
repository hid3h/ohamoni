import { Controller, Get, Render } from "@nestjs/common";
import { GraphsService } from "./graphs.service";

@Controller("graphs")
export class GraphsController {
  constructor(private readonly graphsService: GraphsService) {}

  @Get("/")
  @Render("graphs/show")
  async show() {
    console.log("show です！");
  }
}
