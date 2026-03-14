import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Role } from '../../src/auth/enums';
import { PrismaService } from '../../src/prisma/prisma.service';
import { closeTestApp, createTestApp } from '../support/app';
import { resetDatabase } from '../support/database';
import { buildCreateUserDto, seedBaseCatalog, seedUser } from '../support/factories';

describe('Users e2e', () => {
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

  async function signin(mail: string, password: string) {
    const response = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ mail, password })
      .expect(200);

    return response.body.accessToken as string;
  }

  it('returns 401 when listing users without authentication', async () => {
    await request(app.getHttpServer()).get('/users').expect(401);
  });

  it('returns 403 when a client tries to list users', async () => {
    await seedUser(prisma, {
      mail: 'client-users@sportying.test',
      phone_number: 600000501,
      password: 'client-pass',
      role: Role.CLIENT,
    });

    const token = await signin('client-users@sportying.test', 'client-pass');

    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('allows an admin to list users', async () => {
    await seedUser(prisma, {
      mail: 'admin-users@sportying.test',
      phone_number: 600000502,
      password: 'admin-pass',
      role: Role.ADMIN,
    });

    const token = await signin('admin-users@sportying.test', 'admin-pass');

    const response = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('prevents a client from reading another user profile', async () => {
    const client = await seedUser(prisma, {
      mail: 'client-own@sportying.test',
      phone_number: 600000503,
      password: 'client-own-pass',
      role: Role.CLIENT,
    });
    const otherUser = await seedUser(prisma, {
      mail: 'client-other@sportying.test',
      phone_number: 600000504,
      password: 'client-other-pass',
      role: Role.CLIENT,
    });

    const token = await signin(client.mail, 'client-own-pass');

    await request(app.getHttpServer())
      .get(`/users/${otherUser.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('allows a superadmin to create users', async () => {
    await seedUser(prisma, {
      mail: 'superadmin@sportying.test',
      phone_number: 600000505,
      password: 'superadmin-pass',
      role: Role.SUPERADMIN,
    });

    const token = await signin('superadmin@sportying.test', 'superadmin-pass');

    const response = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${token}`)
      .send(
        buildCreateUserDto({
          mail: 'created-by-superadmin@sportying.test',
          phoneNumber: 600000506,
          role: Role.CLIENT,
        }),
      )
      .expect(201);

    expect(response.body.mail).toBe('created-by-superadmin@sportying.test');
  });
});
