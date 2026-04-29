import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RawMaterialDocument = RawMaterial & Document;

@Schema({
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'RawMaterial',
})
export class RawMaterial {
    @Prop({ required: true })
    name: string;

    @Prop()
    description?: string;

    @Prop()
    unit_measure: string;

    @Prop({ default: 0 })
    stock: number;

    @Prop({ default: 5 })
    min_stock: number;
}

export const RawMaterialSchema = SchemaFactory.createForClass(RawMaterial);
