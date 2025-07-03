import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon from 'argon2';
import { SigninAuthDto, SignupAuthDto } from './dto';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokensDto } from './dto/tokens.dto';
import { Role } from './enums/role.enum';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private usersService: UsersService,
  ) {}

  /**
   * Verifies the provided JWT token and decodes its payload.
   *
   * @param {string} token - The JWT token to be verified.
   * @param {boolean} [isAccessToken=true] - A flag indicating whether the provided token is an access token. If false, the method will use the refresh token secret to verify the token.
   * @return {Promise<{ sub: number; mail: string }>} Resolves with the decoded payload of the token, which includes `sub` (subject) and `mail` (email) fields.
   * @throws {TokenExpiredError} Throws if the token has expired.
   * @throws {UnauthorizedException} Throws if the token is invalid for any other reason.
   */
  async verifyToken(
    token: string,
    isAccessToken: boolean = true,
  ): Promise<{ sub: number; mail: string; role: string }> {
    try {
      const secret = isAccessToken
        ? (this.config.get('JWT_SECRET') as string)
        : (this.config.get('JWT_REFRESH_SECRET') as string);

      return await this.jwt.verifyAsync<{
        sub: number;
        mail: string;
        role: string;
      }>(token, {
        secret: secret,
      });
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw error;
      }

      throw new UnauthorizedException('Invalid token. Please try again.');
    }
  }

  /**
   * Decodes a given JWT token and retrieves its payload.
   *
   * @param token - The JWT token to be decoded.
   * @return The decoded payload containing the subject (sub) and email (mail).
   */
  private decodeToken(token: string) {
    return this.jwt.decode<{ sub: number; mail: string; role: string }>(token);
  }

  /**
   * Validates the provided payload to ensure it contains the required properties.
   *
   * @param {Object} payload - The payload to validate.
   * @param {number} payload.sub - A numerical identifier within the payload.
   * @param {string} payload.mail - An email string within the payload.
   * @return {boolean} Returns true if the payload is valid and contains the required properties; otherwise, false.
   */
  validatePayload(payload: {
    sub: number;
    mail: string;
    role: string;
  }): boolean {
    return !(!payload || !payload.sub || !payload.mail || !payload.role);
  }

  /**
   * Generates signed access and refresh tokens for a given user.
   *
   * @param {number} id - The unique identifier of the user.
   * @param {string} mail - The user's email address.
   * @param {Role} role - The role assigned to the user.
   * @return {Promise<TokensDto>} A promise that resolves to an object containing the signed access and refresh tokens.
   */
  async getSignedTokens(
    id: number,
    mail: string,
    role: Role,
  ): Promise<TokensDto> {
    const payload = {
      sub: id,
      mail,
      role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        expiresIn: '15m',
        secret: this.config.get('JWT_SECRET') as string,
      }),
      this.jwt.signAsync(payload, {
        expiresIn: '7d',
        secret: this.config.get('JWT_REFRESH_SECRET') as string,
      }),
    ]);

    await this.updateDBRefreshToken(id, refreshToken);

    return new TokensDto({
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  }

  /**
   * Updates the refresh token in the database for a specific user.
   *
   * @param {number} id - The unique identifier of the user whose refresh token should be updated.
   * @param {string} refreshToken - The new refresh token to be stored, which will be hashed before saving.
   * @return {Promise<void>} A promise that resolves when the operation is complete.
   */
  async updateDBRefreshToken(id: number, refreshToken: string): Promise<void> {
    const hash = await argon.hash(refreshToken);
    await this.prisma.users.update({
      where: {
        id: id,
      },
      data: {
        refresh_token: hash,
      },
    });
  }

  /**
   * Handles the signup process by creating a new user and generating authentication tokens.
   *
   * @param {SignupAuthDto} dto - The data transfer object containing user signup details, including name, surname,
   * email, phone prefix, phone number, and password.
   * @return {Promise<object>} Returns a Promise that resolves to an object containing the created user details and
   * authentication tokens.
   */
  async signup(dto: SignupAuthDto): Promise<object> {
    const user = await this.usersService.createUser({
      role: Role.CLIENT,
      name: dto.name,
      surname: dto.surname,
      mail: dto.mail,
      phonePrefix: dto.phonePrefix,
      phoneNumber: dto.phoneNumber,
      password: dto.password,
    });

    const tokens = await this.getSignedTokens(user.id, user.mail, user.role);

    return {
      ...tokens,
      user,
    };
  }

  /**
   * Authenticates a user based on the provided credentials.
   *
   * @param {SigninAuthDto} dto - An object containing the sign-in details, including the user's email and password.
   * @return {Promise<TokensDto>} Returns a promise that resolves to signed authentication tokens if the credentials
   * are valid.
   * @throws {ForbiddenException} Throws an exception if the email or password is invalid.
   */
  async signin(dto: SigninAuthDto): Promise<TokensDto> {
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

    // Se verifica si el usuario es un administrador o un cliente
    const admin = await this.prisma.admins.findUnique({
      where: {
        id_complex_id: {
          id: user.id,
          complex_id: 1,
        },
      },
    });
    const role = admin ? Role.ADMIN : Role.CLIENT;

    // Se devuelve el usuario
    return this.getSignedTokens(user.id, user.mail, role);
  }

  /**
   * Logs out a user by setting their refresh token to null in the database.
   *
   * @param {number} id - The ID of the user to log out.
   * @return {Promise<void>} A promise that resolves once the user's refresh token has been cleared.
   */
  async logout(id: number): Promise<void> {
    // Se establece el valor del token a nulo
    await this.prisma.users.updateMany({
      where: {
        id: id,
        refresh_token: {
          not: null,
        },
      },
      data: {
        refresh_token: null,
      },
    });
  }

  /**
   * Refreshes the user's tokens by validating and verifying the provided access and refresh tokens.
   *
   * @param {TokensDto} dto - An object containing the access token and refresh token to be validated.
   * @return {Promise<TokensDto>} A promise that resolves to a new signed token if validation is successful.
   * @throws {UnauthorizedException} If any of the tokens are invalid, expired, or do not match the user.
   */
  async refreshToken(dto: TokensDto): Promise<TokensDto> {
    // Se verifica el token de acceso
    const accessTokenPayload = this.decodeToken(dto.accessToken);
    const validAccessToken = this.validatePayload(accessTokenPayload);
    if (!validAccessToken) {
      throw new UnauthorizedException(
        'Invalid access token. Please try again.',
      );
    }

    // Se trata de obtener el usuario con los datos del token de acceso
    const user = await this.prisma.users.findUnique({
      where: {
        id: accessTokenPayload.sub,
      },
    });

    // Se verifica que el usuario y el token de refresco son válidos
    if (!user || !user.refresh_token) {
      throw new UnauthorizedException('User not registered. Please try again.');
    }

    // Se compara el token de refresco dado con el almacenado
    const refreshTokenMatch = argon.verify(
      user.refresh_token,
      dto.refreshToken,
    );
    if (!refreshTokenMatch) {
      throw new UnauthorizedException(
        'Invalid refresh token. Please try again.',
      );
    }

    // Se obtienen los datos del token de refresco
    const refreshTokenPayload = await this.verifyToken(
      dto.refreshToken,
      false,
    ).catch((error: Error) => {
      if (error instanceof TokenExpiredError) {
        throw error;
      }

      throw new UnauthorizedException(
        'Invalid refresh token. Please try again.',
      );
    });

    // Se validan los datos del token de refresco
    const validRefreshToken = this.validatePayload(refreshTokenPayload);
    if (!validRefreshToken) {
      throw new UnauthorizedException(
        'Invalid refresh token. Please try again.',
      );
    }

    // Se verifica que los datos del token de refresco se corresponden con los del de acceso
    if (accessTokenPayload.sub != refreshTokenPayload.sub) {
      throw new UnauthorizedException(
        'Invalid access token. Please try again.',
      );
    }

    // Se obtiene el rol y los tokens
    const role = Role[accessTokenPayload.role as keyof typeof Role];
    return this.getSignedTokens(user.id, user.mail, role);
  }
}
