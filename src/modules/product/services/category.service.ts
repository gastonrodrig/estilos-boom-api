import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from '../schemas';
import { CreateCategoryDto } from '../dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>
  ) {}

  async findAll() {
    return this.categoryModel.find();
  }

  async create(dto: CreateCategoryDto) {
    const category = new this.categoryModel(dto);
    return await category.save();
  }

  async update(id: string, dto: CreateCategoryDto) {
    const category = await this.categoryModel.findByIdAndUpdate(id, dto, {
      returnDocument: 'after',
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return category;
  }
}