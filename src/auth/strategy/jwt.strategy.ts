import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET') as string,
    });
  }

  async validate(payload: { sub: number; mail: string; role: string }) {
    // Tratar de obtener el usuario dado su identificador
    const user = await this.prisma.users.findUnique({
      where: {
        id: payload.sub,
      },
    });

    // Si no existe, devolver un objeto vacío
    if (!user) return null;

    // Si el rol no coincide, devolver un objeto vacío
    if (payload.role !== user.role) return null;

    // Eliminar la contraseña y el token del objeto y devolver
    const userWithoutPrivateInfo = { ...user } as Partial<typeof user>;
    delete userWithoutPrivateInfo.password;
    delete userWithoutPrivateInfo.refresh_token;

    return userWithoutPrivateInfo;
  }
}

