import {
  Controller,
  Post,
  Body,
} from '@nestjs/common';
import { ClientService } from '../services';
import { CreateClientLandingDto } from '../dtos';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Clients')
@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  @ApiOperation({ summary: 'Create product' })
  create(@Body() dto: CreateClientLandingDto) {
    return this.clientService.createClientLanding(dto);
  }
}