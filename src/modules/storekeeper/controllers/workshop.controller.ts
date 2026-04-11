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
  Delete,
} from '@nestjs/common';
import { AuthRoles } from 'src/auth/decorators';
import { WorkshopService } from '../services';
// import {
//   RequestPasswordResetDto,
//   UpdateExtraDataDto,
//   CreateClientAdminDto,
//   UpdateClientAdminDto,
// } from '../dtos';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from 'src/auth/decorators';
import { Roles } from 'src/core/constants/app.constants';
import { CreateWorkshopDto } from '../dtos/create-workshop.dto';
import { UpdateWorkshopDto } from '../dtos/update-workshop.dto';

@ApiTags('Workshops')
@Controller('storekeeper/workshops')
export class WorkshopController {
  constructor(private readonly workshopService: WorkshopService) { }



  @Get('paginated')
  @ApiBearerAuth('firebase-auth')
  @AuthRoles(Roles.STOREKEEPER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener talleres con paginación, búsqueda y orden',
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
    return this.workshopService.findAllCustomersPaginated(
      limit,
      offset,
      search?.trim() || '',
      sortField,
      sortOrder
    );
  }

   @Post()
    @ApiBearerAuth('firebase-auth')
    @AuthRoles(Roles.STOREKEEPER)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Registrar un nuevo taller desde administrador' })
    createWorkshop(@Body() dto: CreateWorkshopDto) {
        return this.workshopService.createClientAdmin(dto);
    }

    @Patch(':id')
    @ApiBearerAuth('firebase-auth')
    @AuthRoles(Roles.STOREKEEPER)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Actualizar un taller existente' })
    updateWorkshop(@Param('id') id: string, @Body() dto: UpdateWorkshopDto) {
        return this.workshopService.updateWorkshop(id, dto);
    }

    @Delete(':id')
    @ApiBearerAuth('firebase-auth')
    @AuthRoles(Roles.STOREKEEPER)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Eliminar un taller existente' })
    deleteWorkshop(@Param('id') id: string) {

      return this.workshopService.softDeleteWorkshop(id);
    } 
 
}
