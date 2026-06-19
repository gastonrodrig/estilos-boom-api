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
import { Supply, SupplyDocument, SupplyStock, SupplyStockDocument } from '../../supplie/schema';
import { Order } from '../../sales/schemas/order.schema';
import { Favorite } from '../../favorites/schemas/favorite.schema';
import { StorageService } from 'src/modules/firebase/services';
import { CreateProductDto, UpdateProductDto } from '../dto';
import { CreateVariantDto } from '../dto/create-variant.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,

    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,

    @InjectModel(ProductVariant.name)
    private variantModel: Model<ProductVariantDocument>,

    @InjectModel(Supply.name)
    private supplyModel: Model<SupplyDocument>,

    @InjectModel(SupplyStock.name)
    private supplyStockModel: Model<SupplyStockDocument>,

    @InjectModel(Order.name)
    private orderModel: Model<any>,

    @InjectModel(Favorite.name)
    private favoriteModel: Model<any>,

    private storageService: StorageService,
  ) {}

  private async attachVariants(products: ProductDocument[]) {
    if (!products.length) return [];

    const productIds = products.map((p) => p._id);

    const variants = await this.variantModel
      .find({ id_product: { $in: productIds } })
      .lean()
      .exec();

    const byProductId = new Map<string, ProductVariantDocument[]>();

    for (const variant of variants) {
      const key = String((variant as any).id_product);
      const current = byProductId.get(key) ?? [];
      current.push(variant as any);
      byProductId.set(key, current);
    }

    const variantIds = variants.map(v => v._id);
    let stocks = [];
    try {
      const stockModel = this.productModel.db.model('WarehouseStock');
      stocks = await stockModel.find({ id_variant: { $in: variantIds } }).lean().exec();
    } catch (e) {
      console.warn("Could not query WarehouseStock", e);
    }
    
    const stockByVariantId = new Map<string, number>();
    for (const stock of stocks) {
      const vId = String(stock.id_variant);
      const currentStock = stockByVariantId.get(vId) ?? 0;
      stockByVariantId.set(vId, currentStock + (stock.physical_stock || 0));
    }

    return products.map((product) => {
      const plain = product.toObject();
      const pId = product._id.toString();
      const productVariants = byProductId.get(pId) ?? [];

      const variantsWithAvailable = productVariants.map(v => ({
        ...v,
        stock: stockByVariantId.get(String(v._id)) ?? 0,
        available_stock: stockByVariantId.get(String(v._id)) ?? 0,
      }));

      return { ...plain, variants: variantsWithAvailable };
    });
  }

  async findAll(query: any = {}) {
    const { category, section, maxPrice, colors, limit, offset, gender, season, origin_type, include_inactive } = query;
    const filter: any = {};

    if (include_inactive !== 'true' && include_inactive !== true) {
      filter.is_active = true;
    }

    if (origin_type) {
      filter.origin_type = origin_type.toUpperCase();
    }

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
    } else if (section === 'discount') {
      filter.is_discount = true;
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

      return await newVariant.save();
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
    const product = await this.productModel.findById(id)
      .populate('id_category')
      .populate('technical_sheet.id_supply');
    if (!product) throw new NotFoundException('Producto no encontrado');

    const variants = await this.variantModel
      .find({ id_product: product._id })
      .lean()
      .exec();

    const variantIds = variants.map(v => v._id);
    let stocks = [];
    try {
      const stockModel = this.productModel.db.model('WarehouseStock');
      stocks = await stockModel.find({ id_variant: { $in: variantIds } }).lean().exec();
    } catch (e) {
      console.warn("Could not query WarehouseStock", e);
    }
    
    const stockByVariantId = new Map<string, number>();
    for (const stock of stocks) {
      const vId = String(stock.id_variant);
      const currentStock = stockByVariantId.get(vId) ?? 0;
      stockByVariantId.set(vId, currentStock + (stock.physical_stock || 0));
    }

    const variantsWithStock = variants.map(v => ({
      ...v,
      stock: stockByVariantId.get(String(v._id)) ?? 0,
      available_stock: stockByVariantId.get(String(v._id)) ?? 0,
    }));

    return {
      ...product.toObject(),
      variants: variantsWithStock,
    };
  }

  // Convierte el campo image_colors (JSON string o array) a un array de colores alineado por índice
  private parseImageColors(raw: any): (string | null)[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map((c) => c || null);
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map((c) => c || null) : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  async create(dto: CreateProductDto & { image_colors?: any }, files: Express.Multer.File[] = []) {
    try {
      // 1. Subida de imágenes a Storage
      const uploadedImages = await this.storageService.uploadMultipleFiles(
        'products',
        files,
        dto.sku,
      );

      // 2. Emparejamos cada imagen con su color (alineado por índice de subida)
      const colors = this.parseImageColors(dto.image_colors);
      const images = uploadedImages.map((f: any, i: number) => ({
        url: f.url,
        color: colors[i] ?? null,
      }));

      // 3. Crear y guardar el Producto Base
      let parsedTechnicalSheet: any[] = [];
      if (dto.technical_sheet) {
        try {
          const raw = typeof dto.technical_sheet === 'string'
            ? JSON.parse(dto.technical_sheet)
            : dto.technical_sheet;
          parsedTechnicalSheet = Array.isArray(raw) ? raw : [];
        } catch { parsedTechnicalSheet = []; }
      }

      const product = new this.productModel({
        ...dto,
        images,
        technical_sheet: parsedTechnicalSheet,
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
        await this.variantModel.insertMany(
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
      }

      const variants = await this.variantModel
        .find({ id_product: savedProduct._id })
        .lean()
        .exec();

      // 🛠️ Auto-generate Supplies based on Product BOM and Variants
      await this.syncSupplies(savedProduct, rawVariants);

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

  async update(
    id: string,
    dto: UpdateProductDto & { image_colors?: any; existing_images?: any },
    files: Express.Multer.File[] = [],
  ) {
    try {
      const product = await this.productModel.findById(id);
      if (!product) throw new NotFoundException('Producto no encontrado');

      // 1. Punto de partida: las imágenes que el usuario decidió conservar.
      //    Si el front no manda existing_images, conservamos las actuales del documento.
      let images: { url: string; color?: string | null }[];
      if (dto.existing_images !== undefined) {
        try {
          const parsed =
            typeof dto.existing_images === 'string'
              ? JSON.parse(dto.existing_images)
              : dto.existing_images;
          images = Array.isArray(parsed)
            ? parsed.map((img: any) => ({ url: img.url, color: img.color ?? null }))
            : [];
        } catch {
          images = [];
        }
      } else {
        images = (product.images as any) ?? [];
      }

      // 2. Subimos y agregamos las imágenes nuevas con su color.
      if (files && files.length > 0) {
        const newImages = await this.storageService.uploadMultipleFiles(
          'products',
          files,
          dto.sku || product.sku,
        );
        const colors = this.parseImageColors(dto.image_colors);
        images = [
          ...images,
          ...newImages.map((f: any, i: number) => ({ url: f.url, color: colors[i] ?? null })),
        ];
      }

      const updatedProduct = await this.productModel.findByIdAndUpdate(
        id,
        { ...dto, images },
        { new: true },
      );

      if (!updatedProduct) throw new NotFoundException('Producto no encontrado');

      let rawVariants: any[] = [];
      const rawVariantsInput = dto.variants;

      if (rawVariantsInput !== undefined) {
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

        await this.variantModel.deleteMany({
          id_product: new Types.ObjectId(id),
          _id: { $nin: incomingVariantIds.map(vid => new Types.ObjectId(vid)) }
        });

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
                    color: targetColor, 
                    physical_stock: Number(v.stock ?? 0),
                    stock: Number(v.stock ?? 0),
                    sku_variant: String(v.sku_variant ?? ''),
                    min_stock_alert: Number(v.min_stock_alert ?? 10),
                  }
                }
              }
            };
          } else {
            return {
              updateOne: {
                filter: { sku_variant: String(v.sku_variant ?? '') },
                update: {
                  $set: {
                    id_product: new Types.ObjectId(id),
                    size: String(v.size ?? ''),
                    color: targetColor,
                    physical_stock: Number(v.stock ?? 0),
                    stock: Number(v.stock ?? 0),
                    reserved_stock: 0,
                    min_stock_alert: Number(v.min_stock_alert ?? 10),
                  }
                },
                upsert: true
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

      // 🛠️ Auto-generate Supplies based on Product BOM and Variants
      await this.syncSupplies(updatedProduct, rawVariants);

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

  private async syncSupplies(product: any, rawVariants: any[]) {
    if (!product.technical_sheet || product.technical_sheet.length === 0) return;

    // Extraer colores únicos
    const uniqueColors = new Map<string, any>();
    for (const v of rawVariants) {
      let colorObj = v.color;
      if (typeof colorObj === 'string') {
        try { colorObj = JSON.parse(colorObj); } catch { colorObj = { name: colorObj }; }
      }
      if (colorObj?.name) {
        uniqueColors.set(colorObj.name.trim().toLowerCase(), colorObj.name.trim());
      }
    }
    const colorNames = Array.from(uniqueColors.values());
    if (colorNames.length === 0) colorNames.push(''); // Fallback si no hay colores

    for (const item of product.technical_sheet) {
      const baseSupply = await this.supplyModel.findById(item.id_supply).lean();
      if (!baseSupply) continue;

      const specsToEnsure = item.depends_on_color ? colorNames : [''];

      for (const spec of specsToEnsure) {
        // Buscar si ya existe el stock para este id_supply + specification
        const filter = { 
          id_supply: baseSupply._id, 
          specification: spec 
        };
        
        await this.supplyStockModel.findOneAndUpdate(
          filter,
          { $setOnInsert: { physical_stock: 0, average_cost: 0 } },
          { upsert: true, new: true }
        );
      }
    }
  }

  // Mapeos fijos para construir el SKU profesional
  private static readonly GENDER_MAP: Record<string, string> = {
    MUJER: 'MUJ', HOMBRE: 'HOM', UNISEX: 'UNI',
  };

  private static readonly SEASON_MAP: Record<string, string> = {
    'PRIMAVERA 2026': 'P26',
    'VERANO 2026':    'V26',
    'OTOÑO / INVIERNO': 'OI',
    'TODO EL AÑO':    'TA',
  };

  async getNextSkuSequence(abbr: string, gender: string, season: string): Promise<{
    sku: string; prefix: string; sequence: number;
  }> {
    const genCode  = ProductService.GENDER_MAP[gender?.toUpperCase()]  ?? 'UNI';
    const seasCode = ProductService.SEASON_MAP[season] ?? season.slice(0, 3).toUpperCase();
    const prefix   = `${abbr.toUpperCase()}-${genCode}-${seasCode}`;

    // Cuenta cuántos productos ya tienen ese prefijo para calcular el siguiente número
    const count = await this.productModel.countDocuments({
      sku: { $regex: `^${prefix}-` },
    });
    const sequence = count + 1;
    const sku = `${prefix}-${String(sequence).padStart(3, '0')}`;
    return { sku, prefix, sequence };
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

  async getMetrics(id: string) {
    const product = await this.productModel.findById(id).lean();
    if (!product) throw new NotFoundException('Producto no encontrado');

    const variants = await this.variantModel.find({ id_product: new Types.ObjectId(id) }).lean();

    // Favoritos (nivel producto)
    const favoritesCount = await this.favoriteModel.countDocuments({ productId: new Types.ObjectId(id) });

    // Ventas por variante — cruce por nombre + talla + color
    const variantMetrics = await Promise.all(variants.map(async (v) => {
      const colorName = typeof v.color === 'object' ? v.color?.name : v.color;
      const salesCount = await this.orderModel.aggregate([
        { $unwind: '$items' },
        {
          $match: {
            'items.name': { $regex: new RegExp(`^${product.name}$`, 'i') },
            'items.size': v.size,
            'items.color': { $regex: new RegExp(colorName, 'i') },
          },
        },
        { $group: { _id: null, total: { $sum: '$items.quantity' } } },
      ]);

      return {
        id_variant: v._id,
        size: v.size,
        color: v.color,
        sales: salesCount[0]?.total ?? 0,
      };
    }));

    return {
      favorites: favoritesCount,
      variants: variantMetrics,
    };
  }
}