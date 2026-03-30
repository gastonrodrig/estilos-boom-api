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
} from '../schemas';
import { CategoryDocument, Category } from '../schemas';
import { StorageService } from 'src/modules/firebase/services';

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

      return {
        ...plain,
        variants: byProductId.get(pId) ?? [],
      };
    });
  }

  async findAll(query: any = {}) {
    const { category, section, maxPrice, colors, limit, offset } = query;
    const filter: any = { is_active: true };

    if (category) {
      const categoryDoc = await this.categoryModel.findOne({
        name: new RegExp(`^${category}$`, 'i'),
      });

      if (categoryDoc) {
        filter.$or = [
          { id_category: categoryDoc._id },
          { id_category: categoryDoc._id.toString() },
        ];
      } else {
        return { items: [], total: 0 };
      }
    }

    if (section === 'new-in') {
      filter.is_new_in = true;
    } else if (section === 'best-seller') {
      filter.is_best_seller = true;
    }

    if (maxPrice) {
      filter.base_price = { $lte: Number(maxPrice) };
    }

    if (colors) {
      const colorArray = Array.isArray(colors) ? colors : [colors];

      const colorVariants = await this.variantModel
        .find({ color: { $in: colorArray } })
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

async findOne(id: string) {
  const product = await this.productModel.findById(id).populate('id_category');
  if (!product) throw new NotFoundException('Producto no encontrado');

  const variants = await this.variantModel
    .find({ id_product: product._id })
    .lean()
    .exec();

  const result = {
    ...product.toObject(),
    variants,
  };



  return result;
}

  async create(dto: any, files: Express.Multer.File[] = []) {
    try {
      const imageUrls = await this.storageService.uploadMultipleFiles(
        'products',
        files,
        dto.sku,
      );

      const product = new this.productModel({
        ...dto,
        images: imageUrls.map((file: any) => file.url),
      });

      const savedProduct = await product.save();

      const rawVariantsInput =
        dto.variants ??
        dto.variant ??
        dto.product_variants ??
        dto.productVariants ??
        '[]';

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

      if (rawVariants.length > 0) {
        await this.variantModel.insertMany(
          rawVariants.map((v: any) => ({
            id_product: savedProduct._id,
            size: String(v.size ?? ''),
            color: String(v.color ?? ''),
            stock: Number(v.stock ?? 0),
            sku_variant: String(v.sku_variant ?? ''),
          })),
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

  async update(id: string, dto: any, files: Express.Multer.File[] = []) {
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

      const rawVariantsInput =
        dto.variants ??
        dto.variant ??
        dto.product_variants ??
        dto.productVariants;

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

        await this.variantModel.deleteMany({ id_product: new Types.ObjectId(id) });

        if (rawVariants.length > 0) {
          await this.variantModel.insertMany(
            rawVariants.map((v: any) => ({
              id_product: new Types.ObjectId(id),
              size: String(v.size ?? ''),
              color: String(v.color ?? ''),
              stock: Number(v.stock ?? 0),
              sku_variant: String(v.sku_variant ?? ''),
            })),
          );
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

  async updateVariantStock(idVariant: string, stock: number) {
    try {
      const variant = await this.variantModel.findByIdAndUpdate(
        idVariant,
        { stock },
        { new: true },
      );
      if (!variant) throw new NotFoundException('Variante no encontrada');
      return variant;
    } catch (error) {
      throw new InternalServerErrorException(
        `Error al actualizar stock: ${error.message}`,
      );
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