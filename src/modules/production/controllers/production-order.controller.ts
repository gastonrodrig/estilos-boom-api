import { Controller, Get, Post, Body, Patch, Param, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { ProductionService } from '../services/production.service';
import { CreateProductionOrderDto, UpdateProductionOrderDto } from '../dto';

@ApiTags('Production Orders')
@ApiBearerAuth('firebase-auth')
@Controller('production/orders')
export class ProductionOrderController {
    constructor(private readonly productionService: ProductionService) { }

    @Post()
    @ApiOperation({ summary: 'Crear nueva orden de producción' })
    create(@Body() createProductionOrderDto: CreateProductionOrderDto) {
        return this.productionService.createProductionOrder(createProductionOrderDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todas las órdenes de producción' })
    findAll() {
        return this.productionService.findAllProductionOrders();
    }

    @Patch(':id/start')
    @ApiOperation({
        summary: 'Iniciar producción',
        description: 'Cambia el estado de la orden a EN_TALLER y descuenta los insumos del inventario.'
    })
    async start(@Param('id') id: string) {
        this.validateObjectId(id);
        return this.productionService.startProduction(id);
    }

    @Patch(':id/complete')
    @ApiOperation({
        summary: 'Completar producción',
        description: 'Cambia el estado a COMPLETADO y finaliza la orden.'
    })
    async complete(@Param('id') id: string) {
        this.validateObjectId(id);
        return this.productionService.completeProduction(id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener detalle de una orden de producción' })
    findOne(@Param('id') id: string) {
        this.validateObjectId(id);
        return this.productionService.findOneProductionOrder(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar una orden de producción' })
    update(@Param('id') id: string, @Body() updateProductionOrderDto: UpdateProductionOrderDto) {
        this.validateObjectId(id);
        return this.productionService.updateProductionOrder(id, updateProductionOrderDto);
    }

    @Get(':id/requirements')
    @ApiOperation({ summary: 'Obtener insumos requeridos para una orden' })
    findRequirements(@Param('id') id: string) {
        this.validateObjectId(id);
        return this.productionService.getRequirementsByOrder(id);
    }

    private validateObjectId(id: string) {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`ID inválido: ${id} no es un MongoId válido.`);
        }
    }
}
