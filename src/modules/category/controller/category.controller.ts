import { Controller, Post, Get, Body } from '@nestjs/common';
import { CategoryService } from '../service/category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators/public.decorator';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
   @Public()
  @ApiOperation({ summary: 'Crear una nueva categoría' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar todas las categorías activas' })
  findAll() {
    return this.categoryService.findAll();
  }
}