
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ProductModule } from './modules/product/product.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    PrismaModule,
    ProductModule,
    UserModule
  ],
})
export class AppModule {}

