import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ApiKeyStrategy, JwtStrategy, RefreshJwtStrategy } from './strategy';
import { AccessControlService } from './access-control.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    ApiKeyStrategy,
    RefreshJwtStrategy,
    AccessControlService,
  ],
  exports: [AuthService, AccessControlService],
})
export class AuthModule {}
