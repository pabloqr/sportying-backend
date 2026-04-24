import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../../src/auth/enums/index.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import request from 'supertest';
import {
  cleanupComplexes,
  cleanupUsers,
  createAuthHeader,
  createComplexRecord,
  createE2EApp,
  createUserRecord,
  getUniqueMail,
  getUniquePhoneNumber,
  TEST_PHONE_PREFIX,
} from './mock/factories.js';

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const createdUserIds: number[] = [];
  const createdComplexIds: number[] = [];

  beforeAll(async () => {
    const setup = await createE2EApp();

    app = setup.app;
    httpServer = setup.httpServer;
    prisma = setup.prisma;
    jwtService = setup.jwtService;
  });

  afterAll(async () => {
    await app?.close();
  });

  afterEach(async () => {
    await cleanupComplexes(prisma, createdComplexIds);
    await cleanupUsers(prisma, createdUserIds);
  });

  describe('GET /users', () => {
    it('should return an array of users', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds);
      const response = await request(httpServer).get('/users').set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter users by name', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds);
      const created = await createUserRecord(prisma, createdUserIds, Role.CLIENT, {
        name: 'E2EFilterName',
        surname: 'Create',
      });

      const response = await request(httpServer)
        .get('/users')
        .set('Authorization', authHeader)
        .query({ name: 'E2EFilterName' });

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.some((user: any) => user.id === created.id && user.name === 'E2EFilterName')).toBe(true);
    });

    it('should filter users by role', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds);
      const response = await request(httpServer)
        .get('/users')
        .set('Authorization', authHeader)
        .query({ role: Role.CLIENT });

      expect(response.status).toBe(200);
      response.body.forEach((user: any) => {
        expect(user.role).toBe(Role.CLIENT);
      });
    });

    it('should return an empty array when no users match the filters', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds);
      const response = await request(httpServer)
        .get('/users')
        .set('Authorization', authHeader)
        .query({ name: 'UserThatShouldNotExistAnywhere' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should filter users by mail', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds);
      const mail = getUniqueMail('mail_filter');
      await createUserRecord(prisma, createdUserIds, Role.CLIENT, {
        surname: 'MailFilter',
        mail,
      });

      const response = await request(httpServer).get('/users').set('Authorization', authHeader).query({ mail });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].mail).toBe(mail);
    });

    it('should return 403 when a CLIENT tries to list users', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.CLIENT);
      const response = await request(httpServer).get('/users').set('Authorization', authHeader);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /users/:id', () => {
    it('should return a user by id (SUPERADMIN)', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds);
      const created = await createUserRecord(prisma, createdUserIds, Role.CLIENT, { surname: 'GetById' });
      const response = await request(httpServer).get(`/users/${created.id}`).set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(created.id);
    });

    it('should return 200 when CLIENT accesses their own user', async () => {
      const { user, authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.CLIENT, {
        surname: 'GetOwn',
      });
      const response = await request(httpServer).get(`/users/${user.id}`).set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(user.id);
    });

    it('should return 403 when CLIENT tries to access another user', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.CLIENT);
      const created = await createUserRecord(prisma, createdUserIds, Role.CLIENT, { surname: 'GetForbidden' });
      const response = await request(httpServer).get(`/users/${created.id}`).set('Authorization', authHeader);

      expect(response.status).toBe(403);
    });

    it('should return 404 for a non-existing user', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds);
      const response = await request(httpServer).get('/users/999999999').set('Authorization', authHeader);

      expect(response.status).toBe(404);
    });

    it('should return 400 when user id is not numeric', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds);
      const response = await request(httpServer).get('/users/not-a-number').set('Authorization', authHeader);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /users', () => {
    it('should create a CLIENT user successfully', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds);
      const dto = {
        role: Role.CLIENT,
        password: 'password123',
        name: 'E2E',
        surname: 'Create',
        mail: getUniqueMail('create_client'),
        phonePrefix: TEST_PHONE_PREFIX,
        phoneNumber: getUniquePhoneNumber(),
      };

      const response = await request(httpServer).post('/users').set('Authorization', authHeader).send(dto);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.mail).toBe(dto.mail);
      createdUserIds.push(response.body.id);
    });

    it('should return 400 when creating an ADMIN without complexId', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds);
      const dto = {
        role: Role.ADMIN,
        password: 'password123',
        name: 'E2E',
        surname: 'AdminNoComplex',
        mail: getUniqueMail('admin_no_complex'),
        phonePrefix: TEST_PHONE_PREFIX,
        phoneNumber: getUniquePhoneNumber(),
      };

      const response = await request(httpServer).post('/users').set('Authorization', authHeader).send(dto);

      expect(response.status).toBe(400);
    });

    it('should return a controlled error when mail already exists', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds);
      const dto = {
        role: Role.CLIENT,
        password: 'password123',
        name: 'E2E',
        surname: 'Duplicate',
        mail: getUniqueMail('duplicate'),
        phonePrefix: TEST_PHONE_PREFIX,
        phoneNumber: getUniquePhoneNumber(),
      };

      const first = await request(httpServer).post('/users').set('Authorization', authHeader).send(dto);
      createdUserIds.push(first.body.id);

      const response = await request(httpServer).post('/users').set('Authorization', authHeader).send(dto);

      expect(response.status).not.toBe(500);
    });

    it('should create an ADMIN user successfully when complexId is provided', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds);
      const complex = await createComplexRecord(prisma, createdComplexIds);

      const dto = {
        role: Role.ADMIN,
        complexId: complex.id,
        password: 'password123',
        name: 'E2E',
        surname: 'AdminCreate',
        mail: getUniqueMail('admin_create'),
        phonePrefix: TEST_PHONE_PREFIX,
        phoneNumber: getUniquePhoneNumber(),
      };

      const response = await request(httpServer).post('/users').set('Authorization', authHeader).send(dto);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.role).toBe(Role.ADMIN);
      createdUserIds.push(response.body.id);
    });

    it('should return 403 when an ADMIN tries to create a user', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.ADMIN);
      const response = await request(httpServer)
        .post('/users')
        .send({
          role: Role.CLIENT,
          name: 'E2E',
          mail: getUniqueMail('forbidden_admin'),
          phonePrefix: TEST_PHONE_PREFIX,
          phoneNumber: getUniquePhoneNumber(),
        })
        .set('Authorization', authHeader);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /users/:id', () => {
    it('should update a user (SUPERADMIN)', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds);
      const created = await createUserRecord(prisma, createdUserIds, Role.CLIENT, {
        surname: 'Create',
        mail: getUniqueMail('update_superadmin'),
      });
      const response = await request(httpServer)
        .put(`/users/${created.id}`)
        .set('Authorization', authHeader)
        .send({ surname: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body.surname).toBe('Updated');
    });

    it('should return 403 when CLIENT tries to update another user', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.CLIENT);
      const created = await createUserRecord(prisma, createdUserIds, Role.CLIENT, {
        surname: 'UpdateForbidden',
        mail: getUniqueMail('update_forbidden'),
      });
      const response = await request(httpServer)
        .put(`/users/${created.id}`)
        .set('Authorization', authHeader)
        .send({ name: 'ShouldNotUpdate' });

      expect(response.status).toBe(403);
    });

    it('should update the authenticated CLIENT user', async () => {
      const { user, authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.CLIENT, {
        surname: 'UpdateOwn',
        mail: getUniqueMail('update_own'),
      });
      const response = await request(httpServer)
        .put(`/users/${user.id}`)
        .set('Authorization', authHeader)
        .send({ surname: 'UpdatedByOwner' });

      expect(response.status).toBe(200);
      expect(response.body.surname).toBe('UpdatedByOwner');
    });

    it('should return 404 when updating a non-existing user', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds);
      const response = await request(httpServer)
        .put('/users/999999999')
        .set('Authorization', authHeader)
        .send({ name: 'NotFound' });

      expect(response.status).toBe(404);
    });

    it('should return 400 when updating with a non-numeric user id', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds);
      const response = await request(httpServer)
        .put('/users/not-a-number')
        .set('Authorization', authHeader)
        .send({ name: 'Invalid' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should soft-delete a user (SUPERADMIN)', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds);
      const created = await createUserRecord(prisma, createdUserIds, Role.CLIENT, {
        surname: 'Delete',
        mail: getUniqueMail('delete_superadmin'),
      });
      const response = await request(httpServer).delete(`/users/${created.id}`).set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({});

      const dbUser = await prisma.users.findUnique({ where: { id: created.id } });
      expect(dbUser?.is_delete).toBe(true);
    });

    it('should return 403 when CLIENT tries to delete another user', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.CLIENT);
      const created = await createUserRecord(prisma, createdUserIds, Role.CLIENT, {
        surname: 'DeleteForbidden',
        mail: getUniqueMail('delete_forbidden'),
      });
      const response = await request(httpServer).delete(`/users/${created.id}`).set('Authorization', authHeader);

      expect(response.status).toBe(403);
    });

    it('should return 404 when deleting a non-existing user', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds);
      const response = await request(httpServer).delete('/users/999999999').set('Authorization', authHeader);

      expect(response.status).toBe(404);
    });

    it('should return 400 when deleting with a non-numeric user id', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds);
      const response = await request(httpServer).delete('/users/not-a-number').set('Authorization', authHeader);

      expect(response.status).toBe(400);
    });
  });
});
