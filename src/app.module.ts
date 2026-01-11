
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ProductModule } from './modules/product/product.module';

@Module({
  imports: [
    PrismaModule,
    ProductModule,
  ],
})
export class AppModule {}

