import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { withOptimize } from '@prisma/extension-optimize';
import { envs } from '../config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  // Permite acceder dinámicamente a los delegates (prisma.product, prisma.user, etc.)
  private readonly extendedClient: any;

  constructor() {
    super({
      errorFormat: 'pretty',
    });

    // Aplicar la extensión Optimize y guardarla
    this.extendedClient = this.$extends(
      withOptimize({
        apiKey: envs.OPTIMIZE_API_KEY,
      }),
    );

    // Proxy de llamadas a la versión extendida
    return new Proxy(this, {
      get: (target, prop) => {
        if (prop in target.extendedClient) return target.extendedClient[prop];
        return target[prop];
      },
    }) as any;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
