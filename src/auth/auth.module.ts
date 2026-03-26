import { Module, forwardRef } from '@nestjs/common';
import { UserModule } from '../modules/user/user.module';
import { UserSyncService } from './services/user-sync.service';
import { AuthController } from './controllers/auth.controller';

@Module({
  imports: [
    forwardRef(() => UserModule),
  ],
  controllers: [AuthController],
  providers: [UserSyncService],
  exports: [UserSyncService],
})
export class AuthModule { }
