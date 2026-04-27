import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MovementType } from '../enums/production.enums';

export type RawMaterialMovementDocument = RawMaterialMovement & Document;

@Schema({
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'RawMaterialMovement',
})
export class RawMaterialMovement {
    @Prop({ type: Types.ObjectId, ref: 'RawMaterial', required: true })
    id_material: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'ProductionOrder' })
    id_production_order: Types.ObjectId;

    @Prop({ type: String, enum: MovementType, required: true })
    type: MovementType;

    @Prop({ required: true })
    quantity: number;

    @Prop({ required: true })
    previous_stock: number;

    @Prop({ required: true })
    new_stock: number;
}

export const RawMaterialMovementSchema = SchemaFactory.createForClass(RawMaterialMovement);
