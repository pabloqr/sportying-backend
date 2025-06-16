import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET') as string,
    });
  }

  async validate(payload: { sub: number; mail: string }) {
    // Se trata de obtener el usuario dado su identificador
    const user = await this.prisma.users.findUnique({
      where: {
        id: payload.sub,
      },
    });

    // Si no existe, se devuelve un objeto vacío
    if (!user) {
      return {};
    }

    // Se elimina la contraseña del objeto y se devuelve
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
