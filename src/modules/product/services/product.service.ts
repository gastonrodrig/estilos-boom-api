import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Product,
  ProductDocument,
  ProductVariantDocument,
  ProductVariant,
  CategoryDocument,
  Category,
} from '../schemas';
import { StorageService } from 'src/modules/firebase/services';
import { CreateProductDto, UpdateProductDto } from '../dto';
import { CreateVariantDto } from '../dto/create-variant.dto';
import { Warehouse, WarehouseDocument } from '../../warehouse/schema/warehouse.schema';
import { WarehouseStock, WarehouseStockDocument } from '../../warehouse/schema/warehouse-stock.schema';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,

    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,

    @InjectModel(ProductVariant.name)
    private variantModel: Model<ProductVariantDocument>,

    @InjectModel(Warehouse.name)
    private warehouseModel: Model<WarehouseDocument>,

    @InjectModel(WarehouseStock.name)
    private warehouseStockModel: Model<WarehouseStockDocument>,

    private storageService: StorageService,
  ) {}

  private async attachVariants(products: ProductDocument[]) {
    if (!products.length) return [];

    const productIds = products.map((p) => p._id);

    const variants = await this.variantModel
      .find({ id_product: { $in: productIds } })
      .lean()
      .exec();

    // 1. Encontrar el almacén central por defecto (ALM-CEN)
    const centralWarehouse = await this.warehouseModel.findOne({ code: 'ALM-CEN' }).lean().exec();
    const centralWarehouseId = centralWarehouse ? centralWarehouse._id : null;

    // 2. Si hay almacén, buscar los stocks de todas las variantes en ese almacén
    let stockMap = new Map<string, number>();
    if (centralWarehouseId && variants.length > 0) {
      const variantIds = variants.map(v => v._id);
      const stocks = await this.warehouseStockModel.find({
        id_warehouse: centralWarehouseId,
        id_variant: { $in: variantIds }
      }).lean().exec();
      
      for (const st of stocks) {
        // available_stock = physical_stock - reserved_stock
        const available = Math.max(0, (st.physical_stock ?? 0) - (st.reserved_stock ?? 0));
        stockMap.set(st.id_variant.toString(), available);
      }
    }

    const byProductId = new Map<string, any[]>();

    for (const variant of variants) {
      const key = String((variant as any).id_product);
      const current = byProductId.get(key) ?? [];
      
      const varIdStr = variant._id.toString();
      const warehouseStock = stockMap.has(varIdStr) ? stockMap.get(varIdStr)! : 0;

      const enrichedVariant = {
        ...variant,
        stock: warehouseStock,
        available_stock: warehouseStock,
      };

      current.push(enrichedVariant);
      byProductId.set(key, current);
    }

    return products.map((product) => {
      const plain = product.toObject();
      const pId = product._id.toString();
      const variants = byProductId.get(pId) ?? [];

      return { ...plain, variants };
    });
  }

  async findAll(query: any = {}) {
    const { category, section, maxPrice, colors, limit, offset, gender, season } = query;
    const filter: any = { is_active: true };

    if (gender) {
      filter.gender = gender.toUpperCase();
    }

    if (season) {
      filter.season = new RegExp(season, 'i');
    }

    if (maxPrice) {
      filter.base_price = { $lte: Number(maxPrice) };
    }

    if (category) {
      const categoryDoc = await this.categoryModel.findOne({
        name: new RegExp(`^${category}$`, 'i'),
      });

      if (categoryDoc) {
        filter.id_category = categoryDoc._id;
      } else {
        return { items: [], total: 0 };
      }
    }

    if (section === 'new-in') {
      filter.is_new_in = true;
    } else if (section === 'best-seller') {
      filter.is_best_seller = true;
    }

    // 🎨 CORRECCIÓN DE FILTRO: Adaptado para buscar en color.name usando Dot Notation
    if (colors) {
      const colorArray = Array.isArray(colors) ? colors : [colors];

      const colorVariants = await this.variantModel
        .find({ 'color.name': { $in: colorArray } }) // 👈 Cambiado a 'color.name'
        .select('id_product')
        .lean()
        .exec();

      const productIdsByColor = Array.from(
        new Set(colorVariants.map((v: any) => String(v.id_product))),
      );

      if (productIdsByColor.length === 0) {
        return { items: [], total: 0 };
      }

      filter._id = {
        $in: productIdsByColor.map((id) => new Types.ObjectId(id)),
      };
    }

    const skip = Number(offset) || 0;
    const take = Number(limit) || 10;

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate('id_category')
        .skip(skip)
        .limit(take)
        .sort({ created_at: -1 })
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    const itemsWithVariants = await this.attachVariants(items);

    return { items: itemsWithVariants, total };
  }

  async createVariant(dto: CreateVariantDto) {
    try {
      const product = await this.productModel.findById(dto.id_product);
      if (!product) throw new NotFoundException('El producto base no existe');

      const newVariant = new this.variantModel({
        id_product: new Types.ObjectId(dto.id_product),
        size: dto.size,
        color: dto.color, // Espera un objeto { name, hex } según el nuevo CreateVariantDto
        physical_stock: dto.physical_stock ?? 0,
        stock: dto.stock ?? 0,
        reserved_stock: 0,
        sku_variant: dto.sku_variant,
        min_stock_alert: dto.min_stock_alert ?? 10,
      });

      const savedVariant = await newVariant.save();

      // Inicializar WarehouseStock en todos los almacenes activos
      const warehouses = await this.warehouseModel.find({ is_active: true }).exec();
      const initialStock = dto.stock ?? dto.physical_stock ?? 0;
      
      for (const w of warehouses) {
        await new this.warehouseStockModel({
          id_warehouse: w._id,
          id_variant: savedVariant._id,
          physical_stock: w.code === 'ALM-CEN' ? initialStock : 0,
          reserved_stock: 0,
          location_rack: 'Sin Asignar'
        }).save();
      }

      return savedVariant;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Error al crear la variante: ${error.message}`,
      );
    }
  }

  async updateMinStockAlert(idVariant: string, minStock: number) {
    try {
      const variant = await this.variantModel.findByIdAndUpdate(
        idVariant,
        { min_stock_alert: minStock },
        { new: true, runValidators: true },
      );

      if (!variant) throw new NotFoundException('No se encontró la variante especificada');
      return variant;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Error al actualizar el umbral de alerta: ${error.message}`,
      );
    }
  }

  async findOne(id: string) {
    const product = await this.productModel.findById(id).populate('id_category');
    if (!product) throw new NotFoundException('Producto no encontrado');

    const variants = await this.variantModel
      .find({ id_product: product._id })
      .lean()
      .exec();

    // 1. Encontrar el almacén central por defecto (ALM-CEN)
    const centralWarehouse = await this.warehouseModel.findOne({ code: 'ALM-CEN' }).lean().exec();
    const centralWarehouseId = centralWarehouse ? centralWarehouse._id : null;

    // 2. Si hay almacén, buscar los stocks de todas las variantes en ese almacén
    let stockMap = new Map<string, number>();
    if (centralWarehouseId && variants.length > 0) {
      const variantIds = variants.map(v => v._id);
      const stocks = await this.warehouseStockModel.find({
        id_warehouse: centralWarehouseId,
        id_variant: { $in: variantIds }
      }).lean().exec();
      
      for (const st of stocks) {
        const available = Math.max(0, (st.physical_stock ?? 0) - (st.reserved_stock ?? 0));
        stockMap.set(st.id_variant.toString(), available);
      }
    }

    const enrichedVariants = variants.map(variant => {
      const varIdStr = variant._id.toString();
      const warehouseStock = stockMap.has(varIdStr) ? stockMap.get(varIdStr)! : 0;
      return {
        ...variant,
        stock: warehouseStock,
        available_stock: warehouseStock,
      };
    });

    return {
      ...product.toObject(),
      variants: enrichedVariants,
    };
  }

  async create(dto: CreateProductDto, files: Express.Multer.File[] = []) {
    try {
      // 1. Subida de imágenes a Storage
      const imageUrls = await this.storageService.uploadMultipleFiles(
        'products',
        files,
        dto.sku,
      );

      // 3. Crear y guardar el Producto Base
      const product = new this.productModel({
        ...dto,
        images: imageUrls.map((file: any) => file.url),
      });

      const savedProduct = await product.save();
      // 🎨 4. Parseo y validación de las variantes enviadas desde el Front
      let rawVariants: any[] = [];
      if (Array.isArray(dto.variants)) {
        rawVariants = dto.variants;
      } else if (typeof dto.variants === 'string') {
        try {
          rawVariants = JSON.parse(dto.variants);
        } catch {
          rawVariants = [];
        }
      }

      // 5. Inserción masiva de las variantes vinculadas al ID del producto guardado
      if (rawVariants.length > 0) {
        const createdVariants = await this.variantModel.insertMany(
          rawVariants.map((v: any) => {
            // 🛡️ Extraemos el color de forma ultra-segura
            let finalColor = v.color;
            if (typeof v.color === 'string') {
              try {
                finalColor = JSON.parse(v.color);
              } catch {
                finalColor = { name: v.color, hex: '#000000' }; // Fallback por si viene el string antiguo
              }
            }

            return {
              id_product: savedProduct._id,
              size: String(v.size ?? ''),
              color: finalColor, // ✅ Ya no explotará jamás
              physical_stock: Number(v.stock ?? 0), 
              stock: Number(v.stock ?? 0),          
              reserved_stock: 0,
              sku_variant: String(v.sku_variant ?? ''),
              min_stock_alert: Number(v.min_stock_alert ?? 10),
            };
          }),
        );

        // Inicializar WarehouseStock en todos los almacenes activos
        const warehouses = await this.warehouseModel.find({ is_active: true }).exec();
        for (const variant of createdVariants) {
          const initialStock = (variant as any).stock ?? 0;
          for (const w of warehouses) {
            await new this.warehouseStockModel({
              id_warehouse: w._id,
              id_variant: variant._id,
              physical_stock: w.code === 'ALM-CEN' ? initialStock : 0,
              reserved_stock: 0,
              location_rack: 'Sin Asignar'
            }).save();
          }
        }
      }

      const variants = await this.variantModel
        .find({ id_product: savedProduct._id })
        .lean()
        .exec();

      return {
        ...savedProduct.toObject(),
        variants,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error al crear producto: ${error.message}`,
      );
    }
  }

  async update(id: string, dto: UpdateProductDto, files: Express.Multer.File[] = []) {
    try {
      const product = await this.productModel.findById(id);
      if (!product) throw new NotFoundException('Producto no encontrado');

      let imageUrls = product.images;

      if (files && files.length > 0) {
        const newImages = await this.storageService.uploadMultipleFiles(
          'products',
          files,
          dto.sku || product.sku,
        );
        imageUrls = newImages.map((file: any) => file.url);
      }

      const updatedProduct = await this.productModel.findByIdAndUpdate(
        id,
        { ...dto, images: imageUrls },
        { new: true },
      );

      if (!updatedProduct) throw new NotFoundException('Producto no encontrado');

      const rawVariantsInput = dto.variants;

      if (rawVariantsInput !== undefined) {
        let rawVariants: any[] = [];
        if (Array.isArray(rawVariantsInput)) {
          rawVariants = rawVariantsInput;
        } else if (typeof rawVariantsInput === 'string') {
          try {
            rawVariants = JSON.parse(rawVariantsInput);
          } catch {
            rawVariants = [];
          }
        }
        
        const incomingVariantIds = rawVariants
          .filter(v => v._id || v.id)
          .map(v => String(v._id || v.id));

        // Encontrar y eliminar las variantes que ya no están en la lista en cascada con su WarehouseStock
        const variantsToDelete = await this.variantModel.find({
          id_product: new Types.ObjectId(id),
          _id: { $nin: incomingVariantIds.map(vid => new Types.ObjectId(vid)) }
        }).select('_id').lean().exec();
        const deleteIds = variantsToDelete.map(v => v._id);

        if (deleteIds.length > 0) {
          await this.variantModel.deleteMany({ _id: { $in: deleteIds } });
          await this.warehouseStockModel.deleteMany({ id_variant: { $in: deleteIds } });
        }

        const bulkOps = rawVariants.map((v: any) => {
          const variantId = v._id || v.id;
          const targetColor = typeof v.color === 'string' ? JSON.parse(v.color) : v.color;

          if (variantId) {
            return {
              updateOne: {
                filter: { _id: new Types.ObjectId(variantId) },
                update: {
                  $set: {
                    size: String(v.size ?? ''),
                    color: targetColor, // Actualiza con la estructura de objeto completa
                    physical_stock: Number(v.stock ?? 0),
                    stock: Number(v.stock ?? 0),
                    sku_variant: String(v.sku_variant ?? ''),
                  }
                }
              }
            };
          } else {
            return {
              insertOne: {
                document: {
                  id_product: new Types.ObjectId(id),
                  size: String(v.size ?? ''),
                  color: targetColor,
                  physical_stock: Number(v.stock ?? 0),
                  stock: Number(v.stock ?? 0),
                  reserved_stock: 0,
                  sku_variant: String(v.sku_variant ?? ''),
                  min_stock_alert: Number(v.min_stock_alert ?? 10),
                }
              }
            };
          }
        });

        if (bulkOps.length > 0) {
          await this.variantModel.bulkWrite(bulkOps);
        }
      }

      const variants = await this.variantModel
        .find({ id_product: new Types.ObjectId(id) })
        .lean()
        .exec();

      // Asegurar la inicialización de WarehouseStock en todos los almacenes para las variantes nuevas
      const warehouses = await this.warehouseModel.find({ is_active: true }).exec();
      for (const variant of variants) {
        const stockExists = await this.warehouseStockModel.exists({ id_variant: variant._id });
        if (!stockExists) {
          const initialStock = (variant as any).stock ?? 0;
          for (const w of warehouses) {
            await new this.warehouseStockModel({
              id_warehouse: w._id,
              id_variant: variant._id,
              physical_stock: w.code === 'ALM-CEN' ? initialStock : 0,
              reserved_stock: 0,
              location_rack: 'Sin Asignar'
            }).save();
          }
        }
      }

      return {
        ...updatedProduct.toObject(),
        variants,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error al actualizar producto: ${error.message}`,
      );
    }
  }

  async updateVariantStock(idVariant: string, quantity: number) {
    try {
      const variant = await this.variantModel.findByIdAndUpdate(
        idVariant,
        { $inc: { physical_stock: quantity, stock: quantity } }, 
        { new: true },
      );
      if (!variant) throw new NotFoundException('Variante no encontrada');
      return variant;
    } catch (error) {
      throw new InternalServerErrorException(`Error al actualizar stock: ${error.message}`);
    }
  }

  async deactivate(id: string) {
    try {
      const product = await this.productModel.findByIdAndUpdate(
        id,
        { is_active: false },
        { new: true },
      );
      if (!product) throw new NotFoundException('Producto no encontrado');
      return { success: true };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error al desactivar: ${error.message}`,
      );
    }
  }
}