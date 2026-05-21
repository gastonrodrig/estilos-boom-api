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

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,

    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,

    @InjectModel(ProductVariant.name)
    private variantModel: Model<ProductVariantDocument>,

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

    return products.map((product) => {
      const plain = product.toObject();
      const pId = product._id.toString();
      const variants = byProductId.get(pId) ?? [];

      const variantsWithAvailable = variants.map(v => ({
        ...v,
        available_stock: v.stock 
      }));

      return { ...plain, variants: variantsWithAvailable };
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
    const product = await this.productModel.findById(id).populate('id_category');
    if (!product) throw new NotFoundException('Producto no encontrado');

    const variants = await this.variantModel
      .find({ id_product: product._id })
      .lean()
      .exec();

    return {
      ...product.toObject(),
      variants,
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

      // 🧵 2. Parseo de la Ficha Técnica si proviene de Producción
      let parsedTechnicalSheet = undefined;
      if (dto.origin_type === 'PRODUCCION' && dto.technical_sheet) {
        parsedTechnicalSheet = typeof dto.technical_sheet === 'string'
          ? JSON.parse(dto.technical_sheet)
          : dto.technical_sheet;
      }

      // 3. Crear y guardar el Producto Base
      const product = new this.productModel({
        ...dto,
        technical_sheet: parsedTechnicalSheet,
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

      // 🧵 Parseo de la Ficha Técnica para el update en caso se modifique
      let parsedTechnicalSheet = product.technical_sheet;
      if (dto.origin_type === 'PRODUCCION' && dto.technical_sheet) {
        parsedTechnicalSheet = typeof dto.technical_sheet === 'string'
          ? JSON.parse(dto.technical_sheet)
          : dto.technical_sheet;
      } else if (dto.origin_type === 'RETAIL') {
        parsedTechnicalSheet = undefined; // Elimina la ficha si se cambia a Retail
      }

      const updatedProduct = await this.productModel.findByIdAndUpdate(
        id,
        { ...dto, images: imageUrls, technical_sheet: parsedTechnicalSheet },
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