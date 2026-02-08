import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { Product } from '@prisma/client';

@Injectable()
export class ProductService {     
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const exists = await this.prisma.product.findUnique({
      where: { sku: dto.sku },
    });

    if (exists) {
      throw new ConflictException('SKU already exists');
    }

    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        sku: dto.sku,
        price: dto.price,
        stock: dto.stock,
      },
    });
  }

  async findAll(): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async updateStock(id: string, stock: number): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data: { stock },
    });
  }

  async deactivate(id: string): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data: { is_active: false },
    });
  }
}