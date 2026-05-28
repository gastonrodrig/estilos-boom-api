import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ProductModule } from './modules/product/product.module';
import { UserModule } from './modules/user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { MailModule } from './modules/mail/mail.module';
import { FirebaseModule } from './modules/firebase/firebase.module';
import { FirebaseAuthGuard } from './auth/guards/firebase-auth.guard';
import { CartModule } from './modules/cart/cart.module';
import { SupplyModule } from './modules/supplie/supplie.module';

import { ScheduleModule } from '@nestjs/schedule';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { WorkshopModule } from './modules/workshop/workshop.module';
import { ProductionModule } from './modules/production/production.module';
import { MercadoPagoModule } from './modules/mercadopago/mercadopago.module';
import { PaymentManualModule } from './modules/payment-manual/payment-manual.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL'),
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL'),
          maxRetriesPerRequest: null,
          tls: {
            rejectUnauthorized: false
          }
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    MailModule,
    ProductModule,
    UserModule,
    FirebaseModule,
    CartModule,
    SupplyModule,
    InventoryModule,
    SupplierModule,
    WorkshopModule,
    ProductionModule,
    MercadoPagoModule,
    PaymentManualModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: FirebaseAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
