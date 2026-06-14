import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { InventoryModule } from '../inventory/inventory.module';
import { SalesService } from './services/sales.service';
import { UserModule } from '../user/user.module';
import { ProductVariant, ProductVariantSchema } from '../product/schemas/product-variant.schema';

import { OrdersController } from './controllers/orders.controller';
import { AdminOrdersController } from './controllers/admin-orders.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: ProductVariant.name, schema: ProductVariantSchema },
    ]),
    InventoryModule,
    UserModule,
  ],
  controllers: [OrdersController, AdminOrdersController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
