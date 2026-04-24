import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module.js';
import { AccessControlService } from './access-control.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { ApiKeyStrategy, JwtStrategy, RefreshJwtStrategy } from './strategy/index.js';

@Module({
  imports: [JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, ApiKeyStrategy, RefreshJwtStrategy, AccessControlService],
  exports: [AuthService, AccessControlService],
})
export class AuthModule {}

