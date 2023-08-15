import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { DateTimeFormatter, ZoneId, ZonedDateTime } from "@js-joda/core";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    const datetime = "2023-07-03T20:58:00+09:00";
    const hoge = ZonedDateTime.parse(datetime);
    console.log("new Date(datetime)", new Date(datetime));
    console.log("hoge", hoge);
    const fuga = hoge.withZoneSameInstant(ZoneId.of("UTC"));
    console.log(
      "fuga",
      fuga,
      new Date(fuga.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)),
    );
    return this.appService.getHello();
  }
}
