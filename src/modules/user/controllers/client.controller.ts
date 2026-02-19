import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthRoles } from 'src/auth/decorators';
import { FirebaseAuthGuard, RolesGuard } from 'src/auth/guards';
import { ClientService } from '../services';
import {
  CreateClientLandingDto,
  RequestPasswordResetDto,
  UpdateExtraDataDto,
  CreateClientAdminDto,
  UpdateClientAdminDto,
} from '../dtos';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from 'src/auth/decorators';
import { Roles } from 'src/core/constants/app.constants';

@ApiTags('Clients')
@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

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
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'El correo ya fue registrado previamente.',
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
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'El flag de cambio de contraseña ha sido reseteado correctamente.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Error al resetear el flag de cambio de contraseña.',
  })
  resetPasswordChangeFlag(@Param('uid') id: string) {
    return this.clientService.resetPasswordChangeFlag(id);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar enlace de reseteo de contraseña' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Si el correo pertenece a un cliente válido, se enviará el enlace.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Error al solicitar el enlace de reseteo de contraseña.',
  })
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
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'La información extra del usuario ha sido actualizada correctamente.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Error al actualizar la información extra del usuario.',
  })
  async updateExtraData(
    @Param('uid') auth_id: string,
    @Body() UpdateExtraDataDto: UpdateExtraDataDto,
  ) {
    return this.clientService.updateUserExtraData(auth_id, UpdateExtraDataDto);
  }

  @Post('client-admin')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar un nuevo cliente desde administrador' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'El cliente ha sido creado correctamente.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Error al crear el cliente.',
  })
  createClientAdmin(@Body() createClientAdminDto: CreateClientAdminDto) {
    return this.clientService.createClientAdmin(createClientAdminDto);
  }

  @Get('customers-paginated')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener clientes con paginación, búsqueda y orden',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de clientes obtenida paginada correctamente.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Error al obtener los clientes paginados.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortField', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({
    name: 'clientType',
    required: false,
    enum: ['Persona', 'Empresa'], // 👈 igual que Prisma
  })
  findAllCustomersPaginated(
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('search') search?: string,
    @Query('sortField', new DefaultValuePipe('created_at')) sortField?: string,
    @Query('sortOrder', new DefaultValuePipe('asc')) sortOrder?: 'asc' | 'desc',
    @Query('clientType') clientType?: 'Persona' | 'Empresa',
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

  // @Patch('client-admin/:id')
  // @Public() 
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Actualizar un usuario por ID' })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'El usuario ha sido actualizado correctamente.',
  // })
  // @ApiResponse({
  //   status: HttpStatus.BAD_REQUEST,
  //   description: 'Error al actualizar el usuario.',
  // })
  // update(
  //   @Param('id') id: string,
  //   @Body() updateClientAdminDto: UpdateClientAdminDto,
  // ) {
  //   return this.clientService.updateClientAdmin(id, updateClientAdminDto);
  // }
}
