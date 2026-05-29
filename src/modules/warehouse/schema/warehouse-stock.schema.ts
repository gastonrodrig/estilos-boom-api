import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WarehouseStockDocument = WarehouseStock & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'WarehouseStock',
})
export class WarehouseStock {
  @Prop({ type: Types.ObjectId, ref: 'Warehouse', required: true })
  id_warehouse: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ProductVariant', required: true })
  id_variant: Types.ObjectId;

  @Prop({ default: 0, required: true })
  physical_stock: number;

  @Prop({ default: 0, required: true })
  reserved_stock: number;

  @Prop()
  location_rack: string; 
}

export const WarehouseStockSchema = SchemaFactory.createForClass(WarehouseStock);

// Virtual para obtener de manera dinámica el stock disponible para la venta
WarehouseStockSchema.virtual('available_stock').get(function (this: WarehouseStockDocument) {
  return this.physical_stock - this.reserved_stock;
});