import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy, RefreshJwtStrategy } from './strategy';
import { AccessControlService } from './access-control.service';
import { UsersService } from '../users/users.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshJwtStrategy,
    AccessControlService,
    UsersService,
  ],
  exports: [AccessControlService],
})
export class AuthModule {}
