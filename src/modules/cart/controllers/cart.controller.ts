import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Patch,
    Post,
    Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CartService } from '../services';
import { AddCartItemDto, MergeCartDto, UpdateCartItemDto } from '../dto';
// 1. IMPORTA LOS DECORADORES NECESARIOS
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthRoles } from 'src/auth/decorators';
import { Roles } from 'src/core/constants/app.constants';

@ApiTags('Cart') // 2. Agrega la etiqueta para Swagger
@ApiBearerAuth('firebase-auth') // 3. ¡ESTO ES LO MÁS IMPORTANTE! Debe ser igual al de ClientController
@AuthRoles(Roles.CLIENT) // 4. Asegura que el Guard de autenticación se ejecute
@Controller('cart')
export class CartController {
    constructor(private readonly cartService: CartService) {}

    private getAuthId(req: Request): string {
        const authId = (req as any)?.user?.uid;
        if (!authId) {
            // Este error ahora no debería salir porque el Guard validará el token antes
            throw new Error('Auth uid no encontrado en request.user');
        }
        return authId;
    }

    @Get()
    @ApiOperation({ summary: 'Obtener el carrito del usuario autenticado' })
    getCart(@Req() req: Request) {
        const authId = this.getAuthId(req);
        return this.cartService.getCart(authId);
    }

    @Post('items')
    @ApiOperation({ summary: 'Agregar un item al carrito' })
    addItem(@Req() req: Request, @Body() dto: AddCartItemDto) {
        const authId = this.getAuthId(req);
        return this.cartService.addItem(authId, dto);
    }

    @Patch('items')
    @ApiOperation({ summary: 'Actualizar cantidad de un item' })
    updateItem(@Req() req: Request, @Body() dto: UpdateCartItemDto) {
        const authId = this.getAuthId(req);
        return this.cartService.updateItem(authId, dto);
    }

    @Delete('items')
    @HttpCode(200)
    @ApiOperation({ summary: 'Eliminar un item del carrito' })
    removeItem(
        @Req() req: Request,
        @Body() dto: Pick<UpdateCartItemDto, 'productId' | 'size' | 'color'>,
    ) {
        const authId = this.getAuthId(req);
        return this.cartService.removeItem(authId, dto);
    }

    @Post('merge')
    @ApiOperation({ summary: 'Fusionar carrito de invitado con el de usuario' })
    merge(@Req() req: Request, @Body() dto: MergeCartDto) {
        const authId = this.getAuthId(req);
        return this.cartService.mergeCart(authId, dto);
    }
}