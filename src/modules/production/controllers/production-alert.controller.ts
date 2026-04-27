import { Controller, Get, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductionService } from '../services/production.service';

@ApiTags('Production Alerts')
@ApiBearerAuth('firebase-auth')
@Controller('production/alerts')
export class ProductionAlertController {
    constructor(private readonly productionService: ProductionService) { }

    @Get()
    @ApiOperation({ summary: 'Listar todas las alertas no leídas' })
    findAll() {
        return this.productionService.findAllAlerts();
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Marcar una alerta como leída' })
    markAsRead(@Param('id') id: string) {
        return this.productionService.markAlertAsRead(id);
    }
}
