import { Controller, Post, Get, Body, Req, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { SuggestionsService } from '../services';
import { CreateSuggestionDto } from '../dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('suggestions')
@Controller('suggestions')
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a new suggestion' })
  async create(@Req() req: any, @Body() createDto: CreateSuggestionDto) {
    const userId = req.user?.id || req.user?.uid;
    return this.suggestionsService.create(userId, createDto);
  }

  @Get('user/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get suggestions submitted by logged-in user' })
  async findByUser(@Req() req: any) {
    const userId = req.user?.id || req.user?.uid;
    return this.suggestionsService.findByUser(userId);
  }

  @Get('interaction-products')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a paginated list of products the user has interacted with (favorites, orders)' })
  async getInteractionProducts(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number,
  ) {
    const userId = req.user?.id || req.user?.uid;
    return this.suggestionsService.getInteractionProducts(userId, page, limit);
  }
}
