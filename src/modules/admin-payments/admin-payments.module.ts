import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminPaymentsController } from './controllers/admin-payments.controller';
import { AdminPaymentsService } from './services/admin-payments.service';
import { PaymentManualTransaction, PaymentManualTransactionSchema } from '../payment-manual/schemas/payment-manual-transaction.schema';
import { MercadoPagoTransaction, MercadoPagoTransactionSchema } from '../mercadopago/schemas/mercadopago-transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentManualTransaction.name, schema: PaymentManualTransactionSchema },
      { name: MercadoPagoTransaction.name, schema: MercadoPagoTransactionSchema },
    ]),
  ],
  controllers: [AdminPaymentsController],
  providers: [AdminPaymentsService],
})
export class AdminPaymentsModule {}
