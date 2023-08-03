import { Module } from "@nestjs/common";
import { GraphsController } from "./graphs.controller";

@Module({
  controllers: [GraphsController],
})
export class GraphsModule {}
