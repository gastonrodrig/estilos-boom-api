import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { withOptimize } from '@prisma/extension-optimize';
import { envs } from '../config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // Permite acceder dinámicamente a los delegates (prisma.product, prisma.user, etc.)
  [key: string]: any;

  constructor() {
    super({
      errorFormat: 'pretty',
    });
    this.$extends(
      withOptimize({
        apiKey: envs.OPTIMIZE_API_KEY,
      }),
    );
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
