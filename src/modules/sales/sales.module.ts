import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { SalesService } from './services/sales.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
  ],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
