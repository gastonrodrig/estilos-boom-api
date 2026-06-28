import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StorageService } from 'src/modules/firebase/services/storage.service';
import { Supply, SupplyStock, SupplyStockDocument, SupplyTransaction, SupplyTransactionDocument } from '../schema';

@Injectable()
export class SupplyWarehouseService {
  constructor(
    @InjectModel(Supply.name)
    private readonly supplyModel: Model<any>,

    @InjectModel(SupplyStock.name)
    private readonly stockModel: Model<SupplyStockDocument>,

    @InjectModel(SupplyTransaction.name)
    private readonly transactionModel: Model<SupplyTransactionDocument>,

    @InjectModel('ProductionOrder')
    private readonly productionOrderModel: Model<any>,

    private readonly storageService: StorageService,
  ) {}

  async getInventory() {
    // Obtenemos todos los insumos activos
    const supplies = await this.supplyModel.find({ is_active: true }).lean().exec();
    
    // Obtenemos todo el stock registrado
    const stocks = await this.stockModel.find().lean().exec();
    // Cruzamos datos
    const result = [];
    for (const supply of supplies) {
      const relatedStocks = stocks.filter(s => String(s.id_supply) === String(supply._id));
      
      if (relatedStocks.length === 0) {
        result.push({
          ...supply,
          physical_stock: 0,
          average_cost: 0,
          location: '',
          specification: ''
        });
      } else {
        for (const stockInfo of relatedStocks) {
          result.push({
            ...supply,
            id_stock: stockInfo._id,
            physical_stock: stockInfo.physical_stock ?? 0,
            average_cost: stockInfo.average_cost ?? 0,
            location: stockInfo.location ?? '',
            specification: stockInfo.specification ?? ''
          });
        }
      }
    }
    return result;
  }

  async recordPurchase(dto: {
    supplier_name?: string;
    notes?: string;
    items: { id_supply: string; quantity: number; cost: number; specifications?: string }[];
    evidence_files?: Express.Multer.File[];
  }) {
    // Validar que todos los id_supply sean ObjectIds válidos
    for (const item of dto.items) {
      if (!Types.ObjectId.isValid(item.id_supply)) {
        throw new BadRequestException(`id_supply inválido: "${item.id_supply}". Debe ser un ObjectId de MongoDB.`);
      }
    }

    // Upload evidence images if provided
    let evidence_images: string[] = [];
    if (dto.evidence_files && dto.evidence_files.length > 0) {
      try {
        const uploaded = await this.storageService.uploadMultipleFiles('supply-evidence', dto.evidence_files, 'purchases');
        evidence_images = (uploaded as any[]).map(f => f.url);
      } catch (err) {
        throw new InternalServerErrorException(`Error al subir evidencia: ${err.message}`);
      }
    }

    // 1. Registrar la transacción en el historial
    const newTx = new this.transactionModel({
      type: 'PURCHASE',
      supplier_name: dto.supplier_name,
      notes: dto.notes,
      evidence_images,
      items: dto.items.map(i => ({
        id_supply: new Types.ObjectId(i.id_supply),
        quantity: i.quantity,
        cost: i.cost,
        specifications: i.specifications,
      })),
    });
    const savedTx = await newTx.save();

    // 2. Incrementar stock físico y recalcular costo promedio
    for (const item of dto.items) {
      const supplyId = new Types.ObjectId(item.id_supply);
      const spec = item.specifications || '';

      const existing = await this.stockModel.findOne({ id_supply: supplyId, specification: spec }).lean();

      if (existing) {
        const oldStockVal = existing.physical_stock * (existing.average_cost || 0);
        const newStockVal = item.quantity * item.cost;
        const totalQty = existing.physical_stock + item.quantity;
        const newAvg = totalQty > 0 ? (oldStockVal + newStockVal) / totalQty : item.cost;

        await this.stockModel.updateOne(
          { id_supply: supplyId, specification: spec },
          { $set: { physical_stock: totalQty, average_cost: newAvg } },
        );
      } else {
        await this.stockModel.create({
          id_supply: supplyId,
          specification: spec,
          physical_stock: item.quantity,
          average_cost: item.cost,
        });
      }
    }

    return savedTx;
  }

  async recordDispatch(dto: {
    id_workshop: string;
    notes?: string;
    items: { id_supply: string; quantity: number; specifications?: string }[];
  }) {
    // 1. Crear transacción de despacho
    const newTx = new this.transactionModel({
      type: 'DISPATCH',
      id_workshop: new Types.ObjectId(dto.id_workshop),
      notes: dto.notes,
      items: dto.items.map(i => ({
        id_supply: new Types.ObjectId(i.id_supply),
        quantity: i.quantity,
        specifications: i.specifications,
      })),
    });
    const savedTx = await newTx.save();

    // 2. Decrementar el stock físico del almacén de insumos
    for (const item of dto.items) {
      const supplyId = new Types.ObjectId(item.id_supply);
      const spec = item.specifications || '';
      const stock = await this.stockModel.findOne({ id_supply: supplyId, specification: spec });

      if (stock) {
        stock.physical_stock = Math.max(0, stock.physical_stock - item.quantity);
        await stock.save();
      } else {
        // Si no había stock registrado, creamos uno en cero negativo o cero
        const newStock = new this.stockModel({
          id_supply: supplyId,
          specification: spec,
          physical_stock: 0,
        });
        await newStock.save();
      }
    }

    return savedTx;
  }

  async recordReturn(dto: {
    id_workshop?: string;
    notes?: string;
    items: { id_supply: string; quantity: number; specifications?: string }[];
  }) {
    // Filtrar insumos no retornables (ej: Telas)
    const returnableItems: typeof dto.items = [];
    for (const item of dto.items) {
      const supply = await this.supplyModel.findById(item.id_supply).lean();
      if (supply && supply.retornable === false) continue;
      returnableItems.push(item);
    }

    // 1. Crear transacción de devolución (solo con retornables)
    const newTx = new this.transactionModel({
      type: 'RETURN',
      ...(dto.id_workshop ? { id_workshop: new Types.ObjectId(dto.id_workshop) } : {}),
      notes: dto.notes,
      items: returnableItems.map(i => ({
        id_supply: new Types.ObjectId(i.id_supply),
        quantity: i.quantity,
        specifications: i.specifications,
      })),
    });
    const savedTx = await newTx.save();

    // 2. Incrementar el stock físico de reingreso al almacén
    for (const item of returnableItems) {
      const supplyId = new Types.ObjectId(item.id_supply);
      const spec = item.specifications || '';
      const stock = await this.stockModel.findOne({ id_supply: supplyId, specification: spec });

      if (stock) {
        stock.physical_stock += item.quantity;
        await stock.save();
      } else {
        const newStock = new this.stockModel({
          id_supply: supplyId,
          specification: spec,
          physical_stock: item.quantity,
        });
        await newStock.save();
      }
    }

    return savedTx;
  }

  async getTransactions() {
    return this.transactionModel
      .find()
      .populate('items.id_supply')
      .populate('id_workshop')
      .sort({ created_at: -1 })
      .exec();
  }

  async getProductionOrders() {
    return this.productionOrderModel
      .find({ status: { $nin: ['COMPLETADA', 'RECHAZADA'] } })
      .populate('id_winner_workshop')
      .populate({
        path: 'base_items.id_variant',
        model: 'ProductVariant',
        populate: {
          path: 'id_product',
          model: 'Product',
          populate: { path: 'technical_sheet.id_supply', model: 'Supply' },
        },
      })
      .sort({ created_at: -1 })
      .lean()
      .exec();
  }
}
