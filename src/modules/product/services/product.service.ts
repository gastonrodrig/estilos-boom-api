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
    private categoryModel: Model<CategoryDocument>, // 👈 Ahora tiene su decorador

    @InjectModel(ProductVariant.name) 
    private variantModel: Model<ProductVariantDocument>, // 👈 Y este también

    private storageService: StorageService,
  ) {}

  async findAll(query: any = {}) {
  const { category, section, maxPrice, colors, limit, offset } = query;
  const filter: any = { is_active: true };

  if (category) {
    // 1. Buscamos la categoría por nombre (Dresses)
    const categoryDoc = await this.categoryModel.findOne({ 
      name: new RegExp(`^${category}$`, 'i') 
    });

    if (categoryDoc) {
      // 2. BUSQUEDA FLEXIBLE:
      // Filtramos productos que tengan el ID como Objeto O como String
      filter.$or = [
        { id_category: categoryDoc._id }, 
        { id_category: categoryDoc._id.toString() }
      ];
    }  else {
      return { items: [], total: 0 };
    }
  }

 if (section === 'new-in') {
    filter.is_new_in = true;
  } else if (section === 'best-seller') {
    filter.is_best_seller = true;
  }

  // 3. Filtro de Precio (Aseguramos que sea número)
  if (maxPrice) {
    filter.base_price = { $lte: Number(maxPrice) };
  }

  if (colors) {
    const colorArray = Array.isArray(colors) ? colors : [colors];
    filter['variants.color'] = { $in: colorArray };
  }

  const skip = Number(offset) || 0;
  const take = Number(limit) || 10;

  const [items, total] = await Promise.all([
    this.productModel
      .find(filter)
      .populate('id_category') // Trae la data de la categoría
      .skip(skip)
      .limit(take)
      .sort({ created_at: -1 })
      .exec(), // 👈 .exec() es buena práctica en Mongoose
    this.productModel.countDocuments(filter).exec(),
  ]);

  return { items, total };
}

  async findOne(id: string) {
    const product = await this.productModel
      .findById(id)
      .populate('id_category');
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
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
      return await product.save();
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

      return updatedProduct;
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
