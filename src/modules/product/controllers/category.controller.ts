import { Controller, Post, Get, Body, HttpCode, HttpStatus, Patch, Param, Delete } from '@nestjs/common';
import { CreateCategoryDto } from '../dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoryService } from '../services';
import { AuthRoles, Public } from 'src/auth/decorators';
import { Roles } from 'src/core/constants/app.constants';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  @Post()
  // @ApiBearerAuth('firebase-auth')
  // @AuthRoles(Roles.ADMIN)
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una nueva categoría' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get()
  // @ApiBearerAuth('firebase-auth')
  // @AuthRoles(Roles.ADMIN)
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar todas las categorías activas' })
  findAll() {
    return this.categoryService.findAll();
  }

  @Patch(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar una categoría por su ID' })
  update(@Param('id') id: string, @Body() dto: CreateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar una categoría (borrado lógico)' })
  deactivate(@Param('id') id: string) {
    return this.categoryService.deactivate(id);
  }

  @Post('migrate-abbr')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Migración única: rellena abbr y _normalized_name en categorías existentes' })
  migrateAbbr() {
    return this.categoryService.migrateAbbr();
  }
}