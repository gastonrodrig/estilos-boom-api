import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentManualController } from './controllers/payment-manual.controller';
import { PaymentManualService } from './services/payment-manual.service';
import { PaymentManualTransaction, PaymentManualTransactionSchema } from './schemas/payment-manual-transaction.schema';
import { SalesModule } from '../sales/sales.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentManualTransaction.name, schema: PaymentManualTransactionSchema },
    ]),
    SalesModule,
    UserModule,
  ],
  controllers: [PaymentManualController],
  providers: [PaymentManualService],
  exports: [PaymentManualService],
})
export class PaymentManualModule {}
