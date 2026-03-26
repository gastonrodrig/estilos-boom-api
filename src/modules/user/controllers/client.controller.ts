import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  HttpCode,
  HttpStatus,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthRoles } from 'src/auth/decorators';
import { ClientService } from '../services';
import {
  RequestPasswordResetDto,
  UpdateExtraDataDto,
  CreateClientAdminDto,
  UpdateClientAdminDto,
} from '../dtos';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from 'src/auth/decorators';
import { Roles } from 'src/core/constants/app.constants';

@ApiTags('Clients')
@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) { }

  @Get('validate-email/:email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validar si un correo ya fue registrado previamente',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'El correo no está registrado.',
  })
  validateEmailNotRegistered(@Param('email') email: string) {
    return this.clientService.validateEmailNotRegistered(email);
  }

  @Patch('reset-password-flag/:uid')
  @ApiBearerAuth('firebase-auth')
  @AuthRoles(Roles.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resetear el flag de cambio de contraseña para un usuario',
  })
  resetPasswordChangeFlag(@Param('uid') id: string) {
    return this.clientService.resetPasswordChangeFlag(id);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar enlace de reseteo de contraseña' })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.clientService.sendPasswordResetEmail(dto.email);
  }

  @Patch('extra-data/:uid')
  @ApiBearerAuth('firebase-auth')
  @AuthRoles(Roles.CLIENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar información extra de un usuario por uid',
  })
  async updateExtraData(
    @Param('uid') auth_id: string,
    @Body() dto: UpdateExtraDataDto,
  ) {
    return this.clientService.updateUserExtraData(auth_id, dto);
  }

  @Post('client-admin')
  @ApiBearerAuth('firebase-auth')
  @AuthRoles(Roles.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar un nuevo cliente desde administrador' })
  createClientAdmin(@Body() dto: CreateClientAdminDto) {
    return this.clientService.createClientAdmin(dto);
  }

  @Get('customers-paginated')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener clientes con paginación, búsqueda y orden',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortField', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({
    name: 'clientType',
    required: false,
    enum: ['Persona', 'Empresa'],
  })
  findAllCustomersPaginated(
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('search') search?: string,
    @Query('sortField', new DefaultValuePipe('created_at')) sortField?: string,
    @Query('sortOrder', new DefaultValuePipe('asc')) sortOrder?: 'asc' | 'desc',
    @Query('clientType') clientType?: any,
  ) {
    return this.clientService.findAllCustomersPaginated(
      limit,
      offset,
      search?.trim() || '',
      sortField,
      sortOrder,
      clientType,
    );
  }

  @Patch('client-admin/:id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar un cliente por ID' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientAdminDto,
  ) {
    return this.clientService.updateClientAdmin(id, dto);
  }
}
