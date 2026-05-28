import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentManualController } from './controllers/payment-manual.controller';
import { PaymentManualService } from './services/payment-manual.service';
import { PaymentManualTransaction, PaymentManualTransactionSchema } from './schemas/payment-manual-transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentManualTransaction.name, schema: PaymentManualTransactionSchema },
    ]),
  ],
  controllers: [PaymentManualController],
  providers: [PaymentManualService],
  exports: [PaymentManualService],
})
export class PaymentManualModule {}
