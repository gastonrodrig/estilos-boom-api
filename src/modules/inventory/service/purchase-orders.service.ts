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
import { PrePurchaseOrder, PrePurchaseOrderDocument } from '../schema/prepurchaseOrder.schema';
import { PrePurchaseOrdersService } from './prepurchase-order.service';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectModel(PurchaseOrder.name) private poModel: Model<PurchaseOrderDocument>,
    @InjectModel(ProductVariant.name) private variantModel: Model<ProductVariantDocument>,
    @InjectModel(InventoryMovement.name) private movementModel: Model<InventoryMovementDocument>,
    @InjectConnection() private readonly connection: Connection, // Inyecta la conexión para transacciones
    private readonly supplierService: SuppliersService, // Necesitarás esto para el ranking
    private readonly rankingService: RankingService, // Necesitarás esto para el ranking
    @InjectModel(PrePurchaseOrder.name) private preOrderModel: Model<PrePurchaseOrderDocument>, // Para vincular con Pre-Orden
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
    const variantId = new Types.ObjectId(item.id_variant as any);

    // ✅ Ahora Mongoose no borrará el campo 'stock' antes de enviar la orden a Mongo
    const updateResult = await this.variantModel.findByIdAndUpdate(
      variantId,
      { 
        $inc: { 
          physical_stock: Number(item.quantity), 
          stock: Number(item.quantity) 
        } 
      },
      { session, new: true } 
    );

    if (!updateResult) {
      console.error(`Error: Variante ${variantId} no encontrada`);
      continue;
    }

    // Registrar en Kardex
    const movement = new this.movementModel({
      id_variant: variantId,
      id_purchase_order: order._id,
      id_worker: workerId || order.id_worker,
      type: 'ENTRADA',
      quantity: item.quantity,
      previous_stock: Number(updateResult.physical_stock) - item.quantity,
      new_stock: Number(updateResult.physical_stock),
      reason: `Ingreso de mercadería - OC: ${order.order_number}`,
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

  async startQualityCheck(purchaseOrderId: string, preOrderId: string) {
  
  // 1. Actualizamos la Orden de Compra (El stock físico) a EN_REVISION
  await this.poModel.findByIdAndUpdate(
    purchaseOrderId, 
    { status: 'EN_REVISION' }, 
    { returnDocument: 'after' } 
  );

  // 2. 🔥 LA CLAVE: Actualizamos también la Pre-Orden (El seguimiento visual) a EN_REVISION
  const updatedPreOrder = await this.preOrderModel.findByIdAndUpdate(
    preOrderId,
    { status: 'EN_REVISION' }, // 👈 Esto hará que el Stepper en React avance
    { new: true } // Para que nos devuelva el documento actualizado
  )
  .populate('id_purchase_order')
  .populate('id_worker')
  .populate('quotes.id_supplier');

  if (!updatedPreOrder) {
     throw new NotFoundException('Pre-Orden no encontrada en la base de datos.');
  }

  // 3. Devolvemos el objeto listo para Redux
  return {
    prePurchaseOrder: updatedPreOrder
  };
}
// 2. Prolongar Fecha (Acuerdo con proveedor)

async extendDeliveryDate(purchaseOrderId: string, newDate: string, reason: string) {
  // 1. Buscamos la orden primero para obtener las notas actuales
  const order = await this.poModel.findById(purchaseOrderId);
  if (!order) throw new NotFoundException('Orden no encontrada');

  // 2. Concatenamos la nueva nota al string existente
  const extensionNote = `\n[EXTENSIÓN ${new Date().toLocaleDateString()}]: ${reason}`;
  const updatedNotes = order.notes ? order.notes + extensionNote : extensionNote;

  // 3. Actualizamos usando un $set normal (que es lo que hace Mongoose por defecto)
  await this.poModel.findByIdAndUpdate(
    purchaseOrderId,
    { 
      delivery_date_estimated: new Date(newDate),
      notes: updatedNotes // ✅ Ahora enviamos el string completo
    },
    { returnDocument: 'after' }
  );

  // 4. Buscamos la Pre-Orden para el dispatch de Redux
  const updatedPreOrder = await this.preOrderModel.findOne({ id_purchase_order: purchaseOrderId })
    .populate('id_purchase_order')
    .populate('id_worker')
    .populate('quotes.id_supplier');

  return {
    prePurchaseOrder: updatedPreOrder
  };
}

async approveAndInventory(
  purchaseOrderId: string, 
  qualityRating: number, 
  workerId: string
): Promise<any> {
  const session = await this.connection.startSession();
  session.startTransaction();

  try {
    // 1. Buscamos la Orden de Compra (OC)
    const order = await this.poModel.findById(purchaseOrderId);
    if (!order) throw new NotFoundException('Orden de Compra no encontrada');
    if (order.status === 'COMPLETADA') throw new BadRequestException('Esta orden ya fue ingresada al inventario.');

    // 2. PROCESAR STOCK Y KARDEX
    // Reutilizamos tu función privada handleStockReceipt
    await this.handleStockReceipt(order, workerId, session);

    // 3. ACTUALIZAR ESTADO DE LA OC
    order.status = 'COMPLETADA'; // 👈 Sincronizado con tu esquema
    order.quality_rating = qualityRating;
    order.delivery_date_actual = new Date();
    const savedOrder = await order.save({ session });

    // 4. ACTUALIZAR ESTADO DE LA PRE-ORDEN (OPP)
    // Buscamos la OPP que tiene vinculada esta OC
    const updatedPreOrder = await this.preOrderModel.findOneAndUpdate(
      { id_purchase_order: new Types.ObjectId(purchaseOrderId) }, // 🔥 Casteo explícito
      { status: 'COMPLETADA' },
      { session, new: true }
    )
    .populate('id_purchase_order')
    .populate('id_worker')
    .populate('quotes.id_supplier');

    if (!updatedPreOrder) {
        // Si no la encuentra, lanzamos error para que la transacción aborte y no haya inconsistencia
        throw new BadRequestException('No se pudo encontrar la Pre-Orden vinculada para cerrar el flujo.');
    }

    // 5. FINALIZAR TRANSACCIÓN
    await session.commitTransaction();
    session.endSession();

    // 6. ACTUALIZAR RANKING (Fuera de la transacción para no bloquear la DB)
    // El RankingService usará la 'quality_rating' y fechas que acabamos de guardar
    await this.rankingService.updateSupplierRanking(order.id_supplier.toString());

    return {
      message: 'Mercadería integrada con éxito y ranking actualizado.',
      prePurchaseOrder: updatedPreOrder
    };

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}
}