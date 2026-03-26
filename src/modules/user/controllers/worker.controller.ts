import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkerService } from '../services/worker.service';
import { CreateWorkerDto, UpdateWorkerDto } from '../dtos';
import { AuthRoles } from 'src/auth/decorators';
import { Roles } from 'src/core/constants/app.constants';

@ApiTags('Workers')
@Controller('workers')
@ApiBearerAuth('firebase-auth')
@AuthRoles(Roles.ADMIN)
export class WorkerController {
    constructor(private readonly workerService: WorkerService) { }

    @Post()
    @ApiOperation({ summary: 'Registrar un nuevo trabajador' })
    create(@Body() dto: CreateWorkerDto) {
        return this.workerService.createWorker(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todos los trabajadores' })
    findAll() {
        return this.workerService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un trabajador por ID' })
    findOne(@Param('id') id: string) {
        return this.workerService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar información de un trabajador' })
    update(@Param('id') id: string, @Body() dto: UpdateWorkerDto) {
        return this.workerService.updateWorker(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar trabajador' })
    remove(@Param('id') id: string) {
        return this.workerService.remove(id);
    }
}
