import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../schemas/order.schema';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { InventoryService } from '../../inventory/service/inventory.service';
import { User, UserDocument } from '../../user/schemas/user.schema';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>,
    private readonly inventoryService: InventoryService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
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
    try {
      // 1. Encontrar el almacén central por defecto (ALM-CEN)
      const warehouses = await this.inventoryService.findAllWarehouses();
      const defaultWarehouse = warehouses.find(w => w.code === 'ALM-CEN') || warehouses[0];

      if (defaultWarehouse) {
        // 2. Mapear los items de la orden al formato requerido
        const documentItems = order.items.map((item: any) => ({
          id_variant: item.id, // En la compra, 'id' suele ser el _id de la variante
          quantity_expected: item.quantity,
          quantity_received: 0,
          incidence_note: ''
        }));

        // 3. Crear el documento de almacén en estado PENDIENTE
        await this.inventoryService.createWarehouseDocument({
          document_number: `SAL-VENTA-${order.orderNumber.replace('ORD-', '')}`,
          type: 'SALIDA_VENTA',
          status: 'PENDIENTE',
          id_source_warehouse: defaultWarehouse._id.toString(),
          id_target_warehouse: undefined,
          id_origin_doc: order._id.toString(),
          // Como es una venta web automática, usamos el mismo userId (el cliente web) 
          // o el ID del administrador por defecto si lo prefieres.
          id_sender_worker: order.userId.toString(), 
          notes: `Salida de mercadería para la Orden de Venta ${order.orderNumber}`,
          items: documentItems
        });
        
        this.logger.log(`Documento de almacén (SALIDA_VENTA) creado en estado PENDIENTE para ${order.orderNumber}`);
      } else {
        this.logger.error('No se encontró ningún almacén para descontar el stock.');
      }
    } catch (error) {
      this.logger.error(`Error al generar el documento de almacén para ${order.orderNumber}`, error);
    }
  }

  // 5. Obtener pedidos activos del cliente (PORD y ORD en estados tempranos)
  async getActiveOrders(userId: string): Promise<OrderDocument[]> {
    let queryUserId: Types.ObjectId;
    let query;

    if (Types.ObjectId.isValid(userId)) {
      queryUserId = new Types.ObjectId(userId);
      query = { userId: queryUserId };
    } else {
      const user = await this.userModel.findOne({ auth_id: userId }).lean();
      if (user) {
        queryUserId = user._id as Types.ObjectId;
        query = { userId: queryUserId };
      } else {
        // Fallback for development/guest test IDs
        query = { userId: { $in: [new Types.ObjectId('661413a968600d8d73b0a234'), new Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d1')] } };
      }
    }

    return await this.orderModel.find({
      ...query,
      status: { $in: ['PRE_ORDER', 'CONFIRMED', 'OBSERVED', 'PREPARING', 'SHIPPED'] }
    }).sort({ createdAt: -1 }).exec();
  }

  // 5.1 Obtener todos los pedidos para el administrador (Órdenes de Venta)
  async getAdminOrders(): Promise<OrderDocument[]> {
    return await this.orderModel.find({
      status: { $in: ['CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] }
    }).sort({ createdAt: -1 }).exec();
  }

  // 6. Obtener un pedido específico por ID (para el detalle)
  async getOrderById(orderId: string, userId: string): Promise<OrderDocument> {
    let query;

    if (Types.ObjectId.isValid(userId)) {
      query = { userId: new Types.ObjectId(userId) };
    } else {
      const user = await this.userModel.findOne({ auth_id: userId }).lean();
      if (user) {
        query = { userId: user._id };
      } else {
        query = { userId: { $in: [new Types.ObjectId('661413a968600d8d73b0a234'), new Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d1')] } };
      }
    }

    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      ...query
    }).exec();

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }
  // 8. Marcar orden como OBSERVADA
  async observeOrder(orderId: string): Promise<OrderDocument | null> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) return null;

    order.status = 'OBSERVED';
    return await order.save();
  }

  // 9. Actualizar el estado general de una orden
  async updateOrderStatus(orderId: string, status: string): Promise<OrderDocument | null> {
    return await this.orderModel.findByIdAndUpdate(orderId, { status }, { new: true }).exec();
  }
}
