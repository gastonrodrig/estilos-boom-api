import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCategoryDto } from '../dto/create-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const exists = await this.prisma.category.findUnique({
      where: { name: dto.name },
    });

    if (exists) {
      throw new ConflictException('La categoría ya existe');
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });
  }
}