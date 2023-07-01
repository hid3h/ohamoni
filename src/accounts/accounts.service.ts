import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class AccountsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findOrRegister({ lineUserId }: { lineUserId: string }) {
    const account = await this.prismaService.account.findUnique({
      where: {
        lineUserId,
      },
    });

    if (account) {
      return account;
    }

    return this.prismaService.account.create({
      data: {
        lineUserId,
        registeredAt: new Date(),
      },
    });
  }
}
