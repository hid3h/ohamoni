import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { LinebotModule } from "./linebot/linebot.module";
import { ConfigModule } from "@nestjs/config";
import { PrismaService } from "./prisma/prisma.service";

@Module({
  imports: [ConfigModule.forRoot(), LinebotModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
