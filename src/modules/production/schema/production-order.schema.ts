import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// 1. Insumos (BOM) embebidos
@Schema({ _id: false })
export class ProductionSupplyItem {
  @Prop({ required: true })
  id: string; // ID en texto o referencia si tuvieras SupplySchema (usaremos string por simplicidad basado en el front)

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  unitConsumption: number;

  @Prop({ required: true })
  totalQuantity: number;

  @Prop()
  theoreticalQuantity?: number;

  @Prop({ required: true })
  unit: string;
}

export const ProductionSupplyItemSchema = SchemaFactory.createForClass(ProductionSupplyItem);

// 2. Ítems Base (Variantes a producir)
@Schema({ _id: false })
export class ProductionVariantItem {
  @Prop({ type: Types.ObjectId, ref: 'ProductVariant', required: true })
  id_variant: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ default: 0 })
  unit_cost: number;
}
export const ProductionVariantItemSchema = SchemaFactory.createForClass(ProductionVariantItem);

// 3. Cotizaciones de Talleres
@Schema({ _id: false })
export class WorkshopQuote {
  @Prop({ type: Types.ObjectId, ref: 'Workshop', required: true })
  id_agent: Types.ObjectId; // Taller

  @Prop({ type: [ProductionVariantItemSchema], default: [] })
  items: ProductionVariantItem[];

  @Prop({ default: 0 })
  total_amount: number;

  @Prop({ default: 'PENDIENTE', enum: ['PENDIENTE', 'SELECCIONADO', 'RECHAZADO'] })
  quote_status: string;
}
export const WorkshopQuoteSchema = SchemaFactory.createForClass(WorkshopQuote);

export type ProductionOrderDocument = ProductionOrder & Document;

@Schema({ _id: false })
export class StatusHistoryItem {
  @Prop({ required: true })
  status: string;

  @Prop({ default: Date.now })
  date: Date;
}

@Schema({ _id: false })
export class SubStateHistoryItem {
  @Prop({ required: true })
  step: string;

  @Prop({ default: Date.now })
  date: Date;
}
@Schema({ _id: false })
export class ChatMessage {
  @Prop({ required: true, enum: ['bot', 'workshop'] })
  sender: string;

  @Prop({ required: true })
  text: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

@Schema({ _id: false })
export class ProductionProgress {
  @Prop({ default: false }) corteIniciado: boolean;
  @Prop() fechaEstimadaCorte?: string;
  @Prop({ default: false }) costuraIniciada: boolean;
  @Prop() unidadesListas?: number;
  @Prop() fechaProyectadaFin?: string;
}

// 4. Esquema Principal
@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'ProductionOrder' })
export class ProductionOrder {
  @Prop({ required: true, unique: true })
  order_number: string; // OP-2026-001

  @Prop({ required: true, unique: true })
  pre_order_number: string; // OPP-M-2026-xxx

  @Prop({ type: Types.ObjectId, ref: 'Worker', required: true })
  id_worker: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Workshop' })
  id_winner_workshop?: Types.ObjectId;

  @Prop({ type: [ProductionVariantItemSchema], required: true })
  base_items: ProductionVariantItem[];

  @Prop({ type: [ProductionSupplyItemSchema], default: [] })
  supplies: ProductionSupplyItem[];

  @Prop({ type: [WorkshopQuoteSchema], default: [] })
  quotes: WorkshopQuote[];

  @Prop({ default: 0 })
  total_amount: number;

  @Prop({
    enum: ['CONTACTO_INICIAL', 'COMPARANDO', 'EN_PRODUCCION', 'CONTROL_CALIDAD', 'COMPLETADA', 'RECHAZADA'],
    default: 'CONTACTO_INICIAL'
  })
  status: string;

  @Prop({ type: [StatusHistoryItem], default: [] })
  history: StatusHistoryItem[];

  @Prop({ type: [SubStateHistoryItem], default: [] })
  sub_states: SubStateHistoryItem[];

  @Prop()
  observations?: string;

  @Prop()
  delivery_date_estimated?: Date;

  @Prop({
    enum: [
      'IDLE',
      'AWAITING_CORTE',
      'AWAITING_COSTURA',
      'AWAITING_UNIDADES',
      'AWAITING_FECHA_FIN',
      'AWAITING_ENTREGA',
      'AWAITING_UNIDADES_FINALES',
      'AWAITING_NUEVA_FECHA_FIN',
      'COMPLETED',
    ],
    default: 'IDLE'
  })
  botState: string;

  @Prop({ default: false })
  entregaCheckSent: boolean;

  @Prop({ default: false })
  insumos_confirmados: boolean; // El almacenero confirma que los insumos están listos antes de iniciar producción

  @Prop()
  workshopPhone?: string;

  @Prop({ type: ProductionProgress, default: () => ({}) })
  progress: ProductionProgress;

  @Prop({ type: [ChatMessage], default: [] })
  chatHistory: ChatMessage[];
}

export const ProductionOrderSchema = SchemaFactory.createForClass(ProductionOrder);
