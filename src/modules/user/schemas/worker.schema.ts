import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WorkerDocument = Worker & Document;

@Schema({
    timestamps: { createdAt: 'hired_at' },
    collection: 'Worker',
})
export class Worker {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
    id_user: Types.ObjectId;

    @Prop({ required: true })
    role: string;

    @Prop({ default: 'Activo' })
    employment_status: string;
}

export const WorkerSchema = SchemaFactory.createForClass(Worker);
