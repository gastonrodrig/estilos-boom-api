import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('sync')
  @UseGuards(FirebaseAuthGuard)
  async syncUser(@Req() req: any) {
    return this.authService.syncUser(req.user);
  }
}
