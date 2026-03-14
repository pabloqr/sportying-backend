import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Role } from '../../src/auth/enums';
import { PrismaService } from '../../src/prisma/prisma.service';
import { closeTestApp, createTestApp } from '../support/app';
import { resetDatabase } from '../support/database';
import { buildSignupDto, seedBaseCatalog, seedUser } from '../support/factories';

describe('Auth e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await seedBaseCatalog(prisma);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('completes signup --> signin --> refresh-token --> signout', async () => {
    const signupResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(
        buildSignupDto({
          mail: 'auth@sportying.test',
          phoneNumber: 600000401,
        }),
      )
      .expect(201);

    expect(signupResponse.body.user.mail).toBe('auth@sportying.test');
    expect(signupResponse.body.accessToken).toEqual(expect.any(String));
    expect(signupResponse.body.refreshToken).toEqual(expect.any(String));

    const signinResponse = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({
        mail: 'auth@sportying.test',
        password: 'secret123',
      })
      .expect(200);

    const accessToken = signinResponse.body.accessToken;
    const refreshToken = signinResponse.body.refreshToken;

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .send({ refreshToken })
      .expect(200);

    expect(refreshResponse.body.accessToken).toEqual(expect.any(String));
    expect(refreshResponse.body.refreshToken).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .post('/auth/signout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const storedUser = await prisma.users.findUniqueOrThrow({
      where: {
        mail: 'auth@sportying.test',
      },
    });

    expect(storedUser.refresh_token).toBeNull();
  });

  it('rejects signin with invalid credentials', async () => {
    await seedUser(prisma, {
      mail: 'signin@sportying.test',
      phone_number: 600000402,
      password: 'valid-password',
    });

    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({
        mail: 'signin@sportying.test',
        password: 'wrong-password',
      })
      .expect(403);
  });

  it('rejects refresh-token with an invalid body token', async () => {
    await seedUser(prisma, {
      mail: 'refresh@sportying.test',
      phone_number: 600000403,
      role: Role.CLIENT,
    });

    await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .send({ refreshToken: 'not-a-jwt' })
      .expect(401);
  });
});
