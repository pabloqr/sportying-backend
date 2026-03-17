import * as argon from 'argon2';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../src/auth/auth.service';
import { Role } from '../../src/auth/enums';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp, closeTestApp } from '../support/app';
import { resetDatabase } from '../support/database';
import { buildSignupDto, seedBaseCatalog, seedUser } from '../support/factories';

describe('AuthService integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
    authService = app.get(AuthService);
    jwtService = app.get(JwtService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await seedBaseCatalog(prisma);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('signs up a client and persists a hashed refresh token', async () => {
    const result = await authService.signup(
      buildSignupDto({
        mail: 'signup@sportying.test',
        phoneNumber: 600000101,
      }) as any,
    );

    expect(result).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: 900,
      }),
    );

    const storedUser = await prisma.users.findUniqueOrThrow({
      where: {
        mail: 'signup@sportying.test',
      },
    });

    expect(storedUser.role).toBe(Role.CLIENT);
    expect(await argon.verify(storedUser.password, 'secret123')).toBe(true);
    expect(storedUser.refresh_token).not.toBeNull();
  });

  it('signs in an existing user and returns tokens', async () => {
    await seedUser(prisma, {
      mail: 'signin@sportying.test',
      phone_number: 600000102,
      password: 'signin-secret',
    });

    const result = await authService.signin({
      mail: 'signin@sportying.test',
      password: 'signin-secret',
    });

    expect(result).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: expect.objectContaining({
          mail: 'signin@sportying.test',
        }),
      }),
    );
  });

  it('rejects refresh token when it is not the persisted one', async () => {
    const user = await seedUser(prisma, {
      mail: 'refresh@sportying.test',
      phone_number: 600000103,
    });

    await authService.getSignedTokens(user.id, user.mail, Role.CLIENT);

    await expect(
      authService.refreshToken({
        refreshToken: jwtService.sign(
          { sub: user.id, mail: 'different@sportying.test', role: Role.CLIENT },
          {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: '15d',
          },
        ),
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects expired refresh tokens', async () => {
    const user = await seedUser(prisma, {
      mail: 'expired@sportying.test',
      phone_number: 600000104,
    });

    const expiredRefreshToken = jwtService.sign(
      { sub: user.id, mail: user.mail, role: Role.CLIENT },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: -1,
      },
    );

    await prisma.users.update({
      where: {
        id: user.id,
      },
      data: {
        refresh_token: await argon.hash(expiredRefreshToken),
      },
    });

    await expect(
      authService.refreshToken({
        refreshToken: expiredRefreshToken,
      }),
    ).rejects.toThrow();
  });

  it('verifies access tokens and validates api keys', async () => {
    const user = await seedUser(prisma, {
      mail: 'verify@sportying.test',
      phone_number: 600000105,
      role: Role.ADMIN,
    });

    const tokens = await authService.getSignedTokens(user.id, user.mail, Role.ADMIN);
    const payload = await authService.verifyToken(tokens.accessToken);

    expect(payload).toMatchObject({
      sub: user.id,
      mail: user.mail,
      role: Role.ADMIN,
    });

    const apiKey = 'device-secret';
    const device = await prisma.devices.create({
      data: {
        id_key: '11111111-1111-1111-1111-111111111111',
        api_key: await argon.hash(apiKey),
        complex_id: 1,
        type: 'RAIN',
      },
    });

    const validated = await authService.validateApiKey(`${device.id_key}.${apiKey}`);

    expect(validated.id).toBe(device.id);
    expect(validated.complexId).toBe(1);
  });
});
