import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { PurchaseOrder, PurchaseOrderDocument } from '../schema';
import { ProductVariant, ProductVariantDocument } from 'src/modules/product/schemas'; // Ajusta la ruta
import { InventoryMovement,InventoryMovementDocument } from '../schema';
import { CreatePurchaseOrderDto, PurchaseOrderItemDto,UpdateOrderStatusDto } from '../dto';
import { OrderStatus, MovementType } from '../enum/supply.constants';
import { SuppliersService } from 'src/modules/supplier/service/suppliers.service';
import { RankingService } from './ranking.service';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectModel(PurchaseOrder.name) private poModel: Model<PurchaseOrderDocument>,
    @InjectModel(ProductVariant.name) private variantModel: Model<ProductVariantDocument>,
    @InjectModel(InventoryMovement.name) private movementModel: Model<InventoryMovementDocument>,
    @InjectConnection() private readonly connection: Connection, // Inyecta la conexión para transacciones
    private readonly supplierService: SuppliersService, // Necesitarás esto para el ranking
    private readonly rankingService: RankingService, // Necesitarás esto para el ranking
  ) {}

  // 1. Crear una nueva Orden de Compra (Estado Inicial: PENDIENTE)
  async create(createPoDto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const newOrder = new this.poModel({
      ...createPoDto,
      status: OrderStatus.PENDING,
    });
    return newOrder.save();
  }

  // 2. Gestión de Lógica de Estados (El núcleo del módulo)
  async updateStatus(id: string, updateStatusDto: UpdateOrderStatusDto): Promise<PurchaseOrder> {
      const { status, delivery_date_actual, quality_rating, shipping_cost } = updateStatusDto;
      const order = await this.poModel.findById(id);
      if (!order) throw new NotFoundException('Orden no encontrada');
      if (order.status === OrderStatus.RECEIVED) throw new BadRequestException('La orden ya fue procesada.');

      const session = await this.connection.startSession();
      session.startTransaction();

      try {
        if (status === OrderStatus.RECEIVED) {
          // 1. Procesamos stock (Esto se queda dentro de la transacción)
          await this.handleStockReceipt(order, updateStatusDto.id_worker_receiver, session);
          
          // 2. Actualizamos los datos en el objeto 'order'
          order.delivery_date_actual = delivery_date_actual ? new Date(delivery_date_actual) : new Date();
          order.quality_rating = quality_rating;
          order.shipping_cost = shipping_cost;
        }

        order.status = status;
        const savedOrder = await order.save({ session }); // Guardamos cambios con la sesión
        
        // 3. CONFIRMAMOS LA TRANSACCIÓN
        await session.commitTransaction(); 
        session.endSession(); // Cerramos la sesión aquí

        // 4. ¡AHORA SÍ! Disparamos el ranking después del commit
        // Ahora que la OC ya es 'RECEIVED' en la BD, el RankingService la encontrará.
        if (status === OrderStatus.RECEIVED) {
      // Usamos .toString() para asegurar que enviamos el string del ID de MongoDB
          await this.rankingService.updateSupplierRanking(order.id_supplier.toString());
        }

        return savedOrder;
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
      }
    }

  // 3. Función Privada: Procesar la entrada de mercadería al stock y Kardex
  private async handleStockReceipt(order: PurchaseOrderDocument, workerId: string, session: ClientSession) {
    for (const item of order.items) {
      const variant = await this.variantModel.findById(item.id_variant).session(session);
      if (!variant) continue;

      const previousStock = Number(variant.physical_stock ?? 0);
      const newStock = previousStock + item.quantity;

      // Actualizar Variant con la sesión
      await this.variantModel.findByIdAndUpdate(
        item.id_variant, 
        { $inc: { physical_stock: item.quantity } },
        { session }
      );

      // Registrar Movimiento con la sesión
      const movement = new this.movementModel({
        id_variant: item.id_variant,
        id_purchase_order: order._id,
        id_worker: workerId || order.id_worker,
        type: 'ENTRADA',
        quantity: item.quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        reason: `Entrada por OC: ${order.order_number}`,
      });

      await movement.save({ session });
    }
  }

  // 4. Listar órdenes (con filtros opcionales)
  async findAll() {
    return this.poModel.find().populate('id_supplier').populate('id_worker').exec();
  }

  async findOne(id: string) {
    return this.poModel.findById(id).populate('id_supplier').populate('items.id_variant').exec();
  }
}