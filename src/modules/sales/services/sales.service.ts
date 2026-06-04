import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../schemas/order.schema';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>,
  ) {}

  // 1. Crear el PORD (al finalizar checkout manual)
  async createPreOrder(data: any): Promise<OrderDocument> {
    const orderNumber = `PORD-${Math.floor(1000 + Math.random() * 9000)}`; // Temporal para pruebas
    const newOrder = new this.orderModel({
      ...data,
      orderNumber,
      status: 'PRE_ORDER',
    });
    return await newOrder.save();
  }

  // 2. Crear la ORD directa (para Mercado Pago)
  async createConfirmedOrder(data: any): Promise<OrderDocument> {
    const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = new this.orderModel({
      ...data,
      orderNumber,
      status: 'CONFIRMED',
    });
    const savedOrder = await newOrder.save();
    
    // Disparar cascada (Boleta y Movimiento)
    await this.generateOrderDocuments(savedOrder);
    return savedOrder;
  }

  // 3. Confirmar un PORD existente para volverlo ORD (cuando Admin aprueba pago manual)
  async confirmOrder(orderId: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new Error('Order not found');

    // Cambiamos el prefijo de PORD a ORD y el estado a CONFIRMED
    order.orderNumber = order.orderNumber.replace('PORD-', 'ORD-');
    order.status = 'CONFIRMED';
    
    const savedOrder = await order.save();
    
    // Disparar cascada (Boleta y Movimiento)
    await this.generateOrderDocuments(savedOrder);
    return savedOrder;
  }

  // 4. La Cascada (Boleta y Movimiento)
  private async generateOrderDocuments(order: OrderDocument) {
    this.logger.log(`Iniciando cascada para la orden ${order.orderNumber}`);

    // A. Generar Boleta (Invoice)
    const invoiceNumber = `BOL-001-${order.orderNumber.replace('ORD-', '')}`;
    const invoice = new this.invoiceModel({
      invoiceNumber,
      orderId: order._id,
      clientName: order.clientName,
      documentType: 'DNI',
      documentNumber: '00000000',
      amount: order.amount,
      status: 'EMITIDA',
    });
    await invoice.save();
    this.logger.log(`Boleta generada: ${invoiceNumber}`);

    // B. Generar Movimiento de Almacén (SALIDA_VENTA)
    // TODO: Inyectar y llamar al WarehouseService aquí
    this.logger.log(`Movimiento de almacén pendiente de integración`);
  }
}
