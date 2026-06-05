import { Controller, Post, Get, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { FavoritesService } from '../services';
import { CreateFavoriteDto } from '../dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('favorites')
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a product to favorites' })
  async create(@Req() req: any, @Body() createFavoriteDto: CreateFavoriteDto) {
    const userId = req.user?.id || req.user?.uid;
    return this.favoritesService.create(userId, createFavoriteDto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all favorites for the logged-in user' })
  async findAll(@Req() req: any) {
    const userId = req.user?.id || req.user?.uid;
    return this.favoritesService.findAllByUser(userId);
  }

  @Delete(':productId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a product from favorites' })
  async remove(@Req() req: any, @Param('productId') productId: string) {
    const userId = req.user?.id || req.user?.uid;
    return this.favoritesService.remove(userId, productId);
  }
}
