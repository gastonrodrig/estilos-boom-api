import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClientAddressDocument = ClientAddress & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class ClientAddress {
    @Prop({ type: Types.ObjectId, ref: 'Client', required: true })
    id_client: Types.ObjectId;

    @Prop({ required: true })
    address: string;

    @Prop()
    city: string;

    @Prop()
    state: string;

    @Prop()
    postal_code: string;

    @Prop()
    country: string;

    @Prop({ default: false })
    is_default: boolean;
}

export const ClientAddressSchema = SchemaFactory.createForClass(ClientAddress);
