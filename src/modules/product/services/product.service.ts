import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { Product } from '@prisma/client';


@Injectable()
export class ProductService {     
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto): Promise<Product> {
    // 1. Verificamos SKU único
    const exists = await this.prisma.product.findUnique({
      where: { sku: dto.sku },
    });

    if (exists) {
      throw new ConflictException('Este SKU ya está registrado');
    }

    // 2. Creamos con relación a Categoría y nuevos campos
    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        sku: dto.sku,
        price: dto.price,
        stock: dto.stock,
        // AQUÍ ESTÁ LA SOLUCIÓN: Conectamos con la categoría
        category: {
          connect: { id_category: dto.categoryId } 
        },
        // También añade estos si los pusiste en el schema:
        is_best_seller: dto.isBestSeller ?? false,
        is_new_in: dto.isNewIn ?? true,
        images: dto.images ?? [],
      },
      include: { category: true } // Para que devuelva la categoría en la respuesta
    });
  }

  async findAll(categoryName?: string, section?: string): Promise<Product[]> {
    let where: any = { is_active: true };

    // Filtro por nombre de categoría (ej: "Dresses")
    if (categoryName) {
      where.category = { name: categoryName };
    }

    // Filtro por sección (Marketing)
    if (section === 'best-seller') {
      where.is_best_seller = true;
    }
    
    if (section === 'new-in') {
      where.is_new_in = true;
    }

    return this.prisma.product.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: { category: true }, // Importante para ver la categoría en el front
      take: 20, // Tu escudo de seguridad que hablamos
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