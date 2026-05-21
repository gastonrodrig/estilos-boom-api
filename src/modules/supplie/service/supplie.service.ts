import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  InternalServerErrorException 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Supply, SupplyDocument } from '../schema';
import { CreateSupplyDto,UpdateSupplyDto } from '../dto';
import { Product, ProductDocument } from 'src/modules/product/schemas';

@Injectable()
export class SupplyService {
  constructor(
    @InjectModel(Supply.name) 
    private readonly supplyModel: Model<SupplyDocument>,

    @InjectModel(Product.name) 
    private readonly productModel: Model<ProductDocument>,
  ) {}

  /**
   * 📊 Lista todos los insumos calculando en cuántas fichas técnicas de productos activos participa.
   */
  async findAll() {
    try {
      const supplies = await this.supplyModel.find().sort({ created_at: -1 }).lean().exec();

      // Mapeo paralelo concurrente para calcular la métrica "Usado en" de tu tabla
      const suppliesWithUsage = await Promise.all(
        supplies.map(async (supply) => {
          const usageCount = await this.productModel.countDocuments({
            'technical_sheet.id_supply': supply._id,
            is_active: true, // Solo cuenta productos que no estén archivados o desactivados
          });

          return {
            ...supply,
            id: supply._id, // Compatibilidad con DataTables de Next.js
            used_in: usageCount === 0 ? 'Sin usar' : `${usageCount} ${usageCount === 1 ? 'producto' : 'productos'}`
          };
        })
      );

      return suppliesWithUsage;
    } catch (error) {
      throw new InternalServerErrorException(`Error al listar el catálogo de insumos: ${error.message}`);
    }
  }

  /**
   * 📥 Registra un nuevo insumo validando que el nombre no esté duplicado.
   */
  async create(dto: CreateSupplyDto) {
    try {
      const existingSupply = await this.supplyModel.findOne({ 
        name: new RegExp(`^${dto.name.trim()}$`, 'i') 
      });
      
      if (existingSupply) {
        throw new BadRequestException('Ya existe un insumo registrado con ese mismo nombre');
      }

      const newSupply = new this.supplyModel({
        name: dto.name.trim(),
        unit: dto.unit.toLowerCase(),
        category: dto.category,               // 👈 Agregado
        notes: dto.notes ? dto.notes.trim() : '', // 👈 Agregado de forma segura
        is_active: dto.is_active ?? true
      });

      return await newSupply.save();
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(`Error al registrar el insumo: ${error.message}`);
    }
  }

  /**
   * ✏️ Modifica las propiedades de un insumo por su ID (Nombre, unidad, estado).
   */
  async update(id: string, dto: UpdateSupplyDto) {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('El ID del insumo proporcionado no es válido');
      }

      if (dto.name) {
        const duplicate = await this.supplyModel.findOne({
          _id: { $ne: new Types.ObjectId(id) },
          name: new RegExp(`^${dto.name.trim()}$`, 'i')
        });
        if (duplicate) {
          throw new BadRequestException('No puedes renombrar este insumo porque ya existe otro con ese nombre');
        }
      }

      const updateData: any = { ...dto };
      if (dto.name) updateData.name = dto.name.trim();
      if (dto.unit) updateData.unit = dto.unit.toLowerCase();
      if (dto.category) updateData.category = dto.category; // 👈 Agregado para persistencia en Update
      if (dto.notes !== undefined) updateData.notes = dto.notes.trim(); // 👈 Agregado
      const updatedSupply = await this.supplyModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).lean().exec();

      if (!updatedSupply) {
        throw new NotFoundException('El insumo que intentas actualizar no existe');
      }

      return updatedSupply;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(`Error al actualizar el insumo: ${error.message}`);
    }
  }

  /**
   * 🔍 Obtiene el detalle individual de un insumo específico.
   */
  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }
    const supply = await this.supplyModel.findById(id).lean().exec();
    if (!supply) throw new NotFoundException('Insumo no encontrado');
    return supply;
  }

  /**
   * 🚫 Alterna el estado del insumo (Suspender / Reactivar) de forma directa desde la acción de la tabla.
   */
  async toggleStatus(id: string, isActive: boolean) {
    try {
      const supply = await this.supplyModel.findByIdAndUpdate(
        id,
        { is_active: isActive },
        { new: true }
      );
      if (!supply) throw new NotFoundException('Insumo no encontrado');
      return { success: true, status: supply.is_active ? 'Activo' : 'Suspendido' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(`Error al cambiar el estado del insumo: ${error.message}`);
    }
  }
}