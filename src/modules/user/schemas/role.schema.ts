import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoleDocument = Role & Document;

@Schema({
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'Role',
})
export class Role {
    @Prop({ required: true, unique: true })
    name: string;

    @Prop({ type: [String], default: [] })
    permissions: string[];

    @Prop({ default: true })
    is_active: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
