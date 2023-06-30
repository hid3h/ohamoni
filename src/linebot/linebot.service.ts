import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class LinebotService {
  constructor(private readonly prismaService: PrismaService) {}

  async handleEvent(body: any) {
    console.log("body", body);
    const accounts = await this.prismaService.account.findMany();
    console.log("accounts", accounts);
  }
}
