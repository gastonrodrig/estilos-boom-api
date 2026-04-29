import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProductionPriority, ProductionStatus } from '../enums/production.enums';

export type ProductionOrderDocument = ProductionOrder & Document;

@Schema({
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'ProductionOrder',
})
export class ProductionOrder {
    @Prop({ unique: true, required: true })
    order_number: string;

    @Prop({ type: Types.ObjectId, ref: 'ProductVariant', required: true })
    id_product_variant: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Worker', required: true })
    id_worker_manager: Types.ObjectId;

    @Prop({ required: true })
    quantity_to_produce: number;

    @Prop({ type: String, enum: ProductionStatus, default: ProductionStatus.PLANIFICADO })
    status: ProductionStatus;

    @Prop({ type: String, enum: ProductionPriority, default: ProductionPriority.MEDIA })
    priority: ProductionPriority;

    @Prop()
    start_date: Date;

    @Prop({ required: true })
    deadline: Date;

    @Prop()
    completed_at: Date;
}

export const ProductionOrderSchema = SchemaFactory.createForClass(ProductionOrder);
