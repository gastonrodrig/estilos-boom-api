import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
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
import { InventoryService } from './inventory.service';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectModel(PurchaseOrder.name) private poModel: Model<PurchaseOrderDocument>,
    @InjectModel(ProductVariant.name) private variantModel: Model<ProductVariantDocument>,
    private readonly inventoryService: InventoryService,
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
          await this.rankingService.updateRanking(order.id_supplier.toString());
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
    // 1. Buscamos el ID único del Almacén Central en la base de datos
    // Usamos la misma sesión de la transacción para garantizar lectura consistente
    const centralWarehouse = await this.connection.model('Warehouse').findOne(
      { name: 'ALMACEN_CENTRAL' }
    ).session(session).exec() as { _id: any } | null; // 👈 Agregamos este "as" para guiar a TypeScript

    if (!centralWarehouse) {
      throw new InternalServerErrorException(
        'Error crítico: El Almacén Central no está inicializado en el sistema.'
      );
    }

    // 2. Iteramos los artículos de la Orden de Compra para inyectar stock
    for (const item of order.items) {
      const variantId = String(item.id_variant);

      // 🚀 DELEGAMOS TODO EL TRABAJO PESADO AL INVENTORY SERVICE
      // Este método ya se encarga de:
      //   - Obtener o inicializar el stock de la variante en ese almacén.
      //   - Calcular el previous_stock y new_stock exactos.
      //   - Actualizar WarehouseStock y guardar la auditoría en InventoryMovement.
      await this.inventoryService.createMovement({
        id_variant: variantId,
        id_warehouse: String(centralWarehouse._id), // 👈 Destino por defecto
        id_worker: workerId || String(order.id_worker),
        id_purchase_order: String(order._id), // Vinculamos la OC para el Kardex
        type: 'ENTRADA_COMPRA',
        quantity: Number(item.quantity),
        reason: `Ingreso de mercadería por recepción de OC: ${order.order_number}`
      });
      
      // 💡 NOTA PARA TU TESIS:
      // Si aún necesitas actualizar un stock global acumulado en variantModel por compatibilidad 
      // con tu catálogo del front, puedes mantener un $inc aquí, de lo contrario puedes borrarlo
      // y hacer que el front lea directamente de WarehouseStock.
      await this.variantModel.findByIdAndUpdate(
        variantId,
        { $inc: { physical_stock: Number(item.quantity), stock: Number(item.quantity) } },
        { session }
      );
    }
  }

  // 4. Listar órdenes (con filtros opcionales)
  async findAll() {
    return this.poModel.find().populate('id_supplier').populate('id_worker').exec();
  }

  async findOne(id: string) {
  return this.poModel.findById(id)
    .populate('id_supplier')
    .populate({
      path: 'items.id_variant',
      populate: { path: 'id_product' } // 👈 Esto trae el nombre del producto (ej: Polo Barca)
    })
    .exec();
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
  .populate('quotes.id_agent');

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
    .populate('quotes.id_agent');

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
    .populate('quotes.id_agent');

    if (!updatedPreOrder) {
        // Si no la encuentra, lanzamos error para que la transacción aborte y no haya inconsistencia
        throw new BadRequestException('No se pudo encontrar la Pre-Orden vinculada para cerrar el flujo.');
    }

    // 5. FINALIZAR TRANSACCIÓN
    await session.commitTransaction();
    session.endSession();

    // 6. ACTUALIZAR RANKING
    await this.rankingService.updateRanking(order.id_supplier.toString());

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