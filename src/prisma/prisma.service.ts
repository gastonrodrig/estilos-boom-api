import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // Allow accessing generated model delegates (e.g. `prisma.product`) without
  // TypeScript complaining if the generated client typings are not picked up
  // correctly by the compiler in some environments.
  [key: string]: any;
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
