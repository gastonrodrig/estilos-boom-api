import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
} from '@nestjs/common';
import { ProductService } from '../services/product.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators/public.decorator';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create product' })
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List active products' })
  findAll() {
    return this.productService.findAll();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get product by id' })
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Patch(':id/stock/:stock')
  @Public()
  @ApiOperation({ summary: 'Update product stock' })
  updateStock(
    @Param('id') id: string,
    @Param('stock') stock: string,
  ) {
    return this.productService.updateStock(id, Number(stock));
  }

  @Patch(':id/deactivate')
  @Public()
  @ApiOperation({ summary: 'Deactivate product' })
  deactivate(@Param('id') id: string) {
    return this.productService.deactivate(id);
  }
}