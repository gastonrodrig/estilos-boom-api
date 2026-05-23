import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProductionOrder, ProductionOrderDocument } from '../schema/production-order.schema';
import { CreateProductionOrderDto } from '../dto/create-production-order.dto';
import { UpdateWorkshopQuoteDto } from '../dto/update-workshop-quote.dto';

@Injectable()
export class ProductionService {
  constructor(
    @InjectModel(ProductionOrder.name) private productionOrderModel: Model<ProductionOrderDocument>,
  ) {}

  async create(createDto: CreateProductionOrderDto): Promise<ProductionOrder> {
    const { base_items, workshop_ids, id_worker, supplies, observations, delivery_date_estimated } = createDto;

    const initialQuotes = workshop_ids.map(id => ({
      id_agent: new Types.ObjectId(id),
      items: base_items.map(item => ({ ...item, unit_cost: 0 })),
      total_amount: 0,
      quote_status: 'PENDIENTE'
    }));

    const orderNumberStr = Date.now().toString().slice(-6);

    const productionOrder = new this.productionOrderModel({
      pre_order_number: `OPP-M-2026-${orderNumberStr}`,
      order_number: `OP-2026-${orderNumberStr}`,
      id_worker,
      base_items,
      supplies: supplies || [],
      quotes: initialQuotes,
      observations,
      delivery_date_estimated,
      status: 'CONTACTO_INICIAL',
      history: [{ status: 'CONTACTO_INICIAL', date: new Date() }],
      sub_states: []
    });

    return productionOrder.save();
  }

  async findAll() {
    return this.productionOrderModel
      .find()
      .populate('quotes.id_agent')
      .populate('id_worker')
      .populate('id_winner_workshop')
      .populate({
        path: 'base_items.id_variant',
        populate: { path: 'id_product' }
      })
      .sort({ created_at: -1 })
      .exec();
  }

  async findOne(id: string): Promise<ProductionOrder> {
    const order = await this.productionOrderModel.findById(id)
      .populate('quotes.id_agent')
      .populate('id_worker')
      .populate('id_winner_workshop')
      .populate({
        path: 'base_items.id_variant',
        populate: { path: 'id_product' }
      })
      .exec();
    
    if (!order) throw new NotFoundException('Orden de producción no encontrada');
    return order;
  }

  async updateQuote(id: string, updateDto: UpdateWorkshopQuoteDto): Promise<ProductionOrder> {
    const order = await this.productionOrderModel.findById(id);
    if (!order) throw new NotFoundException('Orden de producción no encontrada');

    const quoteIndex = order.quotes.findIndex(q => q.id_agent.toString() === updateDto.id_workshop);
    if (quoteIndex === -1) throw new BadRequestException('El taller no está invitado a esta orden');

    const totalAmount = updateDto.items.reduce((acc, it) => acc + (it.quantity * (it.unit_cost || 0)), 0);

    order.quotes[quoteIndex].items = updateDto.items as any;
    order.quotes[quoteIndex].total_amount = totalAmount;
    
    if (order.status === 'CONTACTO_INICIAL') {
      order.status = 'COMPARANDO';
      order.history.push({ status: 'COMPARANDO', date: new Date() });
    }

    await order.save();
    return this.findOne(id);
  }

  async confirmWorkshop(id: string, workshopId: string): Promise<ProductionOrder> {
    const order = await this.productionOrderModel.findById(id);
    if (!order) throw new NotFoundException('Orden de producción no encontrada');

    const winnerQuote = order.quotes.find(q => q.id_agent.toString() === workshopId);
    if (!winnerQuote) throw new BadRequestException('Cotización del taller no encontrada');

    order.quotes.forEach(q => {
      q.quote_status = q.id_agent.toString() === workshopId ? 'SELECCIONADO' : 'RECHAZADO';
    });

    order.id_winner_workshop = new Types.ObjectId(workshopId);
    order.total_amount = winnerQuote.total_amount;
    order.status = 'EN_PRODUCCION';
    order.history.push({ status: 'EN_PRODUCCION', date: new Date() });

    await order.save();
    return this.findOne(id);
  }

  async updateStatus(id: string, status: string): Promise<ProductionOrder> {
    const order = await this.productionOrderModel.findById(id);
    if (!order) throw new NotFoundException('Orden de producción no encontrada');

    order.status = status;
    order.history.push({ status, date: new Date() });
    await order.save();

    return this.findOne(id);
  }

  async updateSubState(id: string, step: string): Promise<ProductionOrder> {
    const order = await this.productionOrderModel.findById(id);
    if (!order) throw new NotFoundException('Orden de producción no encontrada');

    if (!order.sub_states) order.sub_states = [];
    order.sub_states.push({ step, date: new Date() });

    if (step === 'ENTREGA') {
      order.status = 'CONTROL_CALIDAD';
      order.history.push({ status: 'CONTROL_CALIDAD', date: new Date() });
    }

    await order.save();
    return this.findOne(id);
  }
}
