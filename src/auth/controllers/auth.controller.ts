import { Controller, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserSyncService } from '../services/user-sync.service';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly userService: UserSyncService) {}

  @Post('sync')
  async syncUser(@Req() req: any) {
    return this.userService.syncUser(req.user);
  }
}
