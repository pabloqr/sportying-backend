import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon from 'argon2';
import { SigninAuthDto, SignupAuthDto } from './dto';
import { PrismaClientKnownRequestError } from 'generated/prisma/client/runtime/library';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async signToken(id: number, mail: string): Promise<{ access_token: string }> {
    const payload = {
      sub: id,
      mail,
    };

    const secret: string = this.config.get('JWT_SECRET') as string;

    const token = await this.jwt.signAsync(payload, {
      expiresIn: '1h',
      secret: secret,
    });

    return {
      access_token: token,
    };
  }

  async signup(dto: SignupAuthDto) {
    // Se genera el hash de la contraseña
    const hash = await argon.hash(dto.password);

    // Se almacena el usuario en la BD
    try {
      const user = await this.prisma.users.create({
        data: {
          password: hash,
          name: dto.name,
          surname: dto.surname,
          mail: dto.mail,
          phone_prefix: dto.phone_prefix,
          phone_number: dto.phone_number,
        },
      });

      // (No funciona) Para evitar que se devuelva el hash
      // delete user.password;

      // Se devuelve el usuario almacenado como respuesta de la petición
      return this.signToken(user.id, user.mail);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException(
            'Credentials already exist. Please try again with different credentials.',
          );
        }
      }

      throw error;
    }
  }

  async signin(dto: SigninAuthDto) {
    // Se busca al usuario según el correo electrónico
    const user = await this.prisma.users.findUnique({
      where: {
        mail: dto.mail,
      },
    });

    // Si no se encuentra, se lanza una excepción
    if (!user) {
      throw new ForbiddenException('Credentials invalid. Please try again.');
    }

    // Se compara la contraseña
    const passwordVerified = await argon.verify(user.password, dto.password);

    // Si la contraseña es incorrecta, se lanza una excepción
    if (!passwordVerified) {
      throw new ForbiddenException('Credentials invalid. Please try again.');
    }

    // Se devuelve el usuario
    return this.signToken(user.id, user.mail);
  }
}
