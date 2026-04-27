import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AlertType } from '../enums/production.enums';

export type ProductionAlertDocument = ProductionAlert & Document;

@Schema({
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'ProductionAlert',
})
export class ProductionAlert {
    @Prop({ type: Types.ObjectId, ref: 'ProductionOrder', required: true })
    id_production_order: Types.ObjectId;

    @Prop({ type: String, enum: AlertType, required: true })
    alert_type: AlertType;

    @Prop({ required: true })
    message: string;

    @Prop({ default: false })
    is_read: boolean;
}

export const ProductionAlertSchema = SchemaFactory.createForClass(ProductionAlert);
