import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MercadoPagoController } from './controllers/mercadopago.controller';
import { MercadoPagoService } from './services/mercadopago.service';
import { MercadoPagoTransaction, MercadoPagoTransactionSchema } from './schemas/mercadopago-transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MercadoPagoTransaction.name, schema: MercadoPagoTransactionSchema },
    ]),
  ],
  controllers: [MercadoPagoController],
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class MercadoPagoModule {}
