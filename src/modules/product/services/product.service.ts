import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../schemas/product.schema';
import { ProductVariant, ProductVariantDocument } from '../schemas/product-variant.schema';
import { StorageService } from '../../storage/services/storage.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(ProductVariant.name) private variantModel: Model<ProductVariantDocument>,
    private storageService: StorageService,
  ) { }

  async findAll(query: any = {}) {
    const { category, section, maxPrice, colors } = query;
    const filter: any = { is_active: true };

    if (category) filter.id_category = new Types.ObjectId(category);
    if (section) filter.section = section;
    if (maxPrice) filter.base_price = { $lte: maxPrice };
    if (colors) {
      const colorArray = Array.isArray(colors) ? colors : [colors];
      filter['variants.color'] = { $in: colorArray };
    }

    return this.productModel.find(filter).populate('id_category');
  }

  async findOne(id: string) {
    const product = await this.productModel.findById(id).populate('id_category');
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async create(dto: any, files: Express.Multer.File[] = []) {
    try {
      const imageUrls = await this.storageService.uploadMultipleFiles('products', files, dto.sku);
      const product = new this.productModel({
        ...dto,
        images: imageUrls.map((file: any) => file.url),
      });
      return await product.save();
    } catch (error) {
      throw new InternalServerErrorException(`Error al crear producto: ${error.message}`);
    }
  }

  async update(id: string, dto: any, files: Express.Multer.File[] = []) {
    try {
      const product = await this.productModel.findById(id);
      if (!product) throw new NotFoundException('Producto no encontrado');

      let imageUrls = product.images;

      if (files && files.length > 0) {
        // En un caso real, borraríamos las anteriores si quisiéramos reemplazarlas
        // await this.storageService.deleteFiles(product.images);
        const newImages = await this.storageService.uploadMultipleFiles('products', files, dto.sku || product.sku);
        imageUrls = newImages.map((file: any) => file.url);
      }

      const updatedProduct = await this.productModel.findByIdAndUpdate(
        id,
        { ...dto, images: imageUrls },
        { new: true }
      );

      return updatedProduct;
    } catch (error) {
      throw new InternalServerErrorException(`Error al actualizar producto: ${error.message}`);
    }
  }

  async updateVariantStock(idVariant: string, stock: number) {
    try {
      // Nota: En Mongo, las variantes están en ProductVariant collection
      const variant = await this.variantModel.findByIdAndUpdate(
        idVariant,
        { stock },
        { new: true }
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
        { new: true }
      );
      if (!product) throw new NotFoundException('Producto no encontrado');
      return { success: true };
    } catch (error) {
      throw new InternalServerErrorException(`Error al desactivar: ${error.message}`);
    }
  }
}