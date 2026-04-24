import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_REFRESH_SECRET') as string,
      passReqToCallback: false,
    });
  }

  async validate(payload: { sub: number; mail: string }) {
    // Tratar de obtener el usuario dado su identificador
    const user = await this.prisma.users.findUnique({
      where: {
        id: payload.sub,
      },
    });

    // Si no existe, devolver un objeto vacío
    if (!user) return null;

    // Eliminar la contraseña y el token del objeto y devolver
    const userWithoutPrivateInfo = { ...user } as Partial<typeof user>;
    delete userWithoutPrivateInfo.password;
    delete userWithoutPrivateInfo.refresh_token;

    return userWithoutPrivateInfo;
  }
}

