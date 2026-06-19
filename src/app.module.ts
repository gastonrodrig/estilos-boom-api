import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ProductModule } from './modules/product/product.module';
import { UserModule } from './modules/user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
// import { BullModule } from '@nestjs/bullmq';  // deshabilitado: Upstash límite excedido
// import { MailModule } from './modules/mail/mail.module';
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
import { AdminPaymentsModule } from './modules/admin-payments/admin-payments.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { SalesModule } from './modules/sales/sales.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { SuggestionsModule } from './modules/suggestions/suggestions.module';

@Module({
  imports: [
    AdminPaymentsModule,
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL'),
        serverSelectionTimeoutMS: 5000,
      }),
      inject: [ConfigService],
    }),
    // BullModule deshabilitado temporalmente (Upstash límite excedido)
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    // MailModule,  // deshabilitado: depende de Bull/Redis
    ProductModule,
    UserModule,
    FirebaseModule,
    CartModule,
    SupplyModule,
    WarehouseModule,
    InventoryModule,
    SupplierModule,
    WorkshopModule,
    ProductionModule,
    MercadoPagoModule,
    PaymentManualModule,
    SalesModule,
    FavoritesModule,
    ReviewsModule,
    SuggestionsModule
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
