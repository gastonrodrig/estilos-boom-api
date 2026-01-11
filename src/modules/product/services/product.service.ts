import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';

@Injectable()
export class ProductService {     
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
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

  async findAll() {
    return this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async updateStock(id: string, stock: number) {
    return this.prisma.product.update({
      where: { id },
      data: { stock },
    });
  }

  async deactivate(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}