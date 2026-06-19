import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
  }) {
    // 1. Registrar la transacción en el historial
    const newTx = new this.transactionModel({
      type: 'PURCHASE',
      supplier_name: dto.supplier_name,
      notes: dto.notes,
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
      const stock = await this.stockModel.findOne({ id_supply: supplyId, specification: spec });

      if (stock) {
        // Recalcular promedio ponderado de costos: promedio = (stock anterior * costo anterior + costo nuevo * qty nueva) / stock total nuevo
        const oldStockVal = stock.physical_stock * (stock.average_cost || 0);
        const newStockVal = item.quantity * item.cost;
        const totalQty = stock.physical_stock + item.quantity;

        stock.physical_stock = totalQty;
        stock.average_cost = totalQty > 0 ? (oldStockVal + newStockVal) / totalQty : item.cost;
        await stock.save();
      } else {
        // Crear registro de stock si no existe
        const newStock = new this.stockModel({
          id_supply: supplyId,
          specification: spec,
          physical_stock: item.quantity,
          average_cost: item.cost,
        });
        await newStock.save();
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
    id_workshop: string;
    notes?: string;
    items: { id_supply: string; quantity: number; specifications?: string }[];
  }) {
    // 1. Crear transacción de devolución
    const newTx = new this.transactionModel({
      type: 'RETURN',
      id_workshop: new Types.ObjectId(dto.id_workshop),
      notes: dto.notes,
      items: dto.items.map(i => ({
        id_supply: new Types.ObjectId(i.id_supply),
        quantity: i.quantity,
        specifications: i.specifications,
      })),
    });
    const savedTx = await newTx.save();

    // 2. Incrementar el stock físico de reingreso al almacén
    for (const item of dto.items) {
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
