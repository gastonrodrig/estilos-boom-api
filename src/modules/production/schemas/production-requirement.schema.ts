import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductionRequirementDocument = ProductionRequirement & Document;

@Schema({
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'ProductionRequirement',
})
export class ProductionRequirement {
    @Prop({ type: Types.ObjectId, ref: 'ProductionOrder', required: true })
    id_production_order: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'RawMaterial', required: true })
    id_material: Types.ObjectId;

    @Prop({ required: true })
    quantity_required: number;

    @Prop({ default: false })
    was_discounted: boolean;
}

export const ProductionRequirementSchema = SchemaFactory.createForClass(ProductionRequirement);
