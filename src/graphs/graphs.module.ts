import { Module } from "@nestjs/common";
import { GraphsController } from "./graphs.controller";
import { GraphsService } from "./graphs.service";

@Module({
  controllers: [GraphsController],
  providers: [GraphsService],
})
export class GraphsModule {}
