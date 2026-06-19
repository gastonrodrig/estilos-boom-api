import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../schemas/order.schema';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { InventoryService } from '../../inventory/service/inventory.service';
import { User, UserDocument } from '../../user/schemas/user.schema';
import { ProductVariant, ProductVariantDocument } from '../../product/schemas/product-variant.schema';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>,
    private readonly inventoryService: InventoryService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(ProductVariant.name) private readonly variantModel: Model<ProductVariantDocument>,
  ) {}

  async validateOrderStock(items: any[]) {
    // 1. Encontrar el almacén central por defecto (ALM-CEN)
    const warehouses = await this.inventoryService.findAllWarehouses();
    const defaultWarehouse = warehouses.find(w => w.code === 'ALM-CEN') || warehouses[0];
    if (!defaultWarehouse) {
      throw new Error('Almacén central no configurado en el sistema.');
    }

    // 2. Para cada artículo de la orden, verificar disponibilidad
    for (const item of items) {
      let variantId = item.id;
      if (!variantId) continue;

      // Robust variant resolution: if item.id is a product ID, find the variant ID using size and color
      if (Types.ObjectId.isValid(variantId)) {
        const variantExists = await this.variantModel.exists({ _id: new Types.ObjectId(variantId) });
        if (!variantExists) {
          const colorName = typeof item.color === 'object' ? item.color?.name : item.color;
          const resolvedVariant = await this.variantModel.findOne({
            id_product: new Types.ObjectId(variantId),
            size: item.size,
            'color.name': new RegExp(`^${colorName}$`, 'i')
          }).lean().exec();
          
          if (resolvedVariant) {
            variantId = resolvedVariant._id.toString();
          } else {
            throw new BadRequestException(
              `El producto "${item.name}" con Talla: ${item.size || 'N/A'} y Color: ${colorName || 'N/A'} no existe como variante en el catálogo.`
            );
          }
        }
      }

      const available = await this.inventoryService.getStockForWarehouse(
        defaultWarehouse._id.toString(),
        variantId
      );

      if (available < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para el producto "${item.name}" (Talla: ${item.size || 'N/A'}). Disponible: ${available}, solicitado: ${item.quantity}.`
        );
      }
    }
  }

  // 1. Crear el PORD (al finalizar checkout manual)
  async createPreOrder(data: any): Promise<OrderDocument> {
    await this.validateOrderStock(data.items);
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
    await this.validateOrderStock(data.items);
    const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = new this.orderModel({
      ...data,
      orderNumber,
      status: 'PREPARING',
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

    await this.validateOrderStock(order.items);

    // Cambiamos el prefijo de PORD a ORD y el estado a PREPARING
    order.orderNumber = order.orderNumber.replace('PORD-', 'ORD-');
    order.status = 'PREPARING';
    
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
        // 2. Mapear los items de la orden al formato requerido, resolviendo las variantes reales
        const documentItems = [];
        for (const item of order.items) {
          let variantId = item.id;
          if (Types.ObjectId.isValid(item.id)) {
            const variantExists = await this.variantModel.exists({ _id: new Types.ObjectId(item.id) });
            if (!variantExists) {
              const colorName = typeof item.color === 'object' ? item.color?.name : item.color;
              const resolvedVariant = await this.variantModel.findOne({
                id_product: new Types.ObjectId(item.id),
                size: item.size,
                'color.name': new RegExp(`^${colorName}$`, 'i')
              }).lean().exec();
              if (resolvedVariant) {
                variantId = resolvedVariant._id.toString();
              }
            }
          }
          documentItems.push({
            id_variant: new Types.ObjectId(variantId),
            quantity_expected: item.quantity,
            quantity_received: 0,
            incidence_note: ''
          });
        }

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

        order.status = 'PREPARING';
        await order.save();
        this.logger.log(`Estado de orden actualizado a PREPARING para ${order.orderNumber}`);
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

  // 5.2 Obtener historial de pedidos del cliente (DELIVERED y CANCELLED)
  async getHistoryOrders(userId: string): Promise<OrderDocument[]> {
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
      status: { $in: ['DELIVERED', 'CANCELLED'] }
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

  // 10. Confirmar entrega de parte del cliente
  async confirmDelivery(orderId: string, userId: string): Promise<OrderDocument> {
    const order = await this.getOrderById(orderId, userId);
    if (order.status !== 'SHIPPED') {
      throw new Error('Solo se puede confirmar la entrega de pedidos en camino.');
    }
    order.status = 'DELIVERED';
    return await order.save();
  }
}
