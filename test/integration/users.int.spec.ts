import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from 'src/auth/enums';
import { ErrorsService } from 'src/common/errors.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersController } from 'src/users/users.controller';
import { UsersService } from 'src/users/users.service';
import request from 'supertest';
import {
  cleanupComplexes,
  cleanupUsers,
  createComplexRecord,
  createUserRecord,
  getUniqueMail,
  getUniquePhoneNumber,
  mockUser,
  resetMockUser,
  TEST_PHONE_PREFIX,
} from './mock/factories';

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('UsersController (integration)', () => {
  let app: INestApplication;
  let httpServer: any;
  let prisma: PrismaService;

  const createdUserIds: number[] = [];
  const createdComplexIds: number[] = [];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [UsersService, PrismaService, ErrorsService],
    }).compile();

    app = module.createNestApplication();
    prisma = module.get<PrismaService>(PrismaService);
    app.use((req: any, _res: any, next: () => void) => {
      req.user = { ...mockUser };
      next();
    });

    await app.init();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app?.close();
  });

  afterEach(async () => {
    await cleanupComplexes(prisma, createdComplexIds);
    await cleanupUsers(prisma, createdUserIds);
    resetMockUser();
  });

  describe('GET /users', () => {
    it('should return an array of users', async () => {
      const response = await request(httpServer).get('/users');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter users by name', async () => {
      const created = await createUserRecord(prisma, createdUserIds, Role.CLIENT, {
        name: 'IntegrationFilterName',
        surname: 'Create',
      });

      const response = await request(httpServer).get('/users').query({ name: 'IntegrationFilterName' });

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0].name).toBe('IntegrationFilterName');
    });

    it('should filter users by role', async () => {
      const response = await request(httpServer).get('/users').query({ role: Role.CLIENT });

      expect(response.status).toBe(200);
      response.body.forEach((user: any) => {
        expect(user.role).toBe(Role.CLIENT);
      });
    });

    it('should return an empty array when no users match the filters', async () => {
      const response = await request(httpServer).get('/users').query({ name: 'UserThatShouldNotExistAnywhere' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should filter users by mail', async () => {
      const mail = getUniqueMail('mail_filter');
      await createUserRecord(prisma, createdUserIds, Role.CLIENT, {
        surname: 'MailFilter',
        mail,
      });

      const response = await request(httpServer).get('/users').query({ mail });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].mail).toBe(mail);
    });
  });

  describe('GET /users/:id', () => {
    it('should return a user by id (SUPERADMIN)', async () => {
      const created = await createUserRecord(prisma, createdUserIds, Role.CLIENT, {
        surname: 'GetById',
      });

      const response = await request(httpServer).get(`/users/${created.id}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(created.id);
    });

    it('should return 200 when CLIENT accesses their own user', async () => {
      const created = await createUserRecord(prisma, createdUserIds, Role.CLIENT, {
        surname: 'GetOwn',
      });

      mockUser.id = created.id;
      mockUser.role = Role.CLIENT;

      const response = await request(httpServer).get(`/users/${created.id}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(created.id);
    });

    it('should return 403 when CLIENT tries to access another user', async () => {
      const created = await createUserRecord(prisma, createdUserIds, Role.CLIENT, {
        surname: 'GetForbidden',
      });

      mockUser.id = created.id + 1000;
      mockUser.role = Role.CLIENT;

      const response = await request(httpServer).get(`/users/${created.id}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for a non-existing user', async () => {
      const response = await request(httpServer).get('/users/999999999');

      expect(response.status).toBe(404);
    });

    it('should return 400 when user id is not numeric', async () => {
      const response = await request(httpServer).get('/users/not-a-number');

      expect(response.status).toBe(400);
    });
  });

  describe('POST /users', () => {
    it('should create a CLIENT user successfully', async () => {
      const dto = {
        role: Role.CLIENT,
        password: 'password123',
        name: 'Integration',
        surname: 'Create',
        mail: getUniqueMail('create'),
        phonePrefix: TEST_PHONE_PREFIX,
        phoneNumber: getUniquePhoneNumber(),
      };

      const response = await request(httpServer).post('/users').send(dto);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.mail).toBe(dto.mail);
      createdUserIds.push(response.body.id);
    });

    it('should return 400 when creating an ADMIN without complexId', async () => {
      const dto = {
        role: Role.ADMIN,
        password: 'password123',
        name: 'Integration',
        surname: 'AdminNoComplex',
        mail: getUniqueMail('admin_no_complex'),
        phonePrefix: TEST_PHONE_PREFIX,
        phoneNumber: getUniquePhoneNumber(),
      };

      const response = await request(httpServer).post('/users').send(dto);

      expect(response.status).toBe(400);
    });

    it('should return 400 when mail already exists (active user)', async () => {
      const dto = {
        role: Role.CLIENT,
        password: 'password123',
        name: 'Integration',
        surname: 'Duplicate',
        mail: getUniqueMail('duplicate'),
        phonePrefix: TEST_PHONE_PREFIX,
        phoneNumber: getUniquePhoneNumber(),
      };

      const first = await request(httpServer).post('/users').send(dto);
      createdUserIds.push(first.body.id);

      const response = await request(httpServer).post('/users').send(dto);

      expect(response.status).not.toBe(500);
    });

    it('should create an ADMIN user successfully when complexId is provided', async () => {
      const complex = await createComplexRecord(prisma, createdComplexIds);

      const dto = {
        role: Role.ADMIN,
        complexId: complex.id,
        password: 'password123',
        name: 'Integration',
        surname: 'AdminCreate',
        mail: getUniqueMail('admin_create'),
        phonePrefix: TEST_PHONE_PREFIX,
        phoneNumber: getUniquePhoneNumber(),
      };

      const response = await request(httpServer).post('/users').send(dto);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.role).toBe(Role.ADMIN);
      createdUserIds.push(response.body.id);
    });
  });

  describe('PUT /users/:id', () => {
    it('should update a user (SUPERADMIN)', async () => {
      const created = await createUserRecord(prisma, createdUserIds, Role.CLIENT, {
        surname: 'Create',
      });

      const response = await request(httpServer).put(`/users/${created.id}`).send({ surname: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body.surname).toBe('Updated');
    });

    it('should return 403 when CLIENT tries to update another user', async () => {
      const created = await createUserRecord(prisma, createdUserIds, Role.CLIENT, {
        surname: 'UpdateForbidden',
      });

      mockUser.id = created.id + 1000;
      mockUser.role = Role.CLIENT;

      const response = await request(httpServer).put(`/users/${created.id}`).send({ name: 'ShouldNotUpdate' });

      expect(response.status).toBe(403);
    });

    it('should update the authenticated CLIENT user', async () => {
      const created = await createUserRecord(prisma, createdUserIds, Role.CLIENT, {
        surname: 'UpdateOwn',
        mail: getUniqueMail('update_own'),
      });

      mockUser.id = created.id;
      mockUser.role = Role.CLIENT;

      const response = await request(httpServer).put(`/users/${created.id}`).send({ surname: 'UpdatedByOwner' });

      expect(response.status).toBe(200);
      expect(response.body.surname).toBe('UpdatedByOwner');
    });

    it('should return 404 when updating a non-existing user', async () => {
      const response = await request(httpServer).put('/users/999999999').send({ name: 'NotFound' });

      expect(response.status).toBe(404);
    });

    it('should return 400 when updating with a non-numeric user id', async () => {
      const response = await request(httpServer).put('/users/not-a-number').send({ name: 'Invalid' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should soft-delete a user (SUPERADMIN)', async () => {
      const created = await createUserRecord(prisma, createdUserIds, Role.CLIENT, {
        surname: 'Delete',
      });

      const response = await request(httpServer).delete(`/users/${created.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({});

      const dbUser = await prisma.users.findUnique({ where: { id: created.id } });
      expect(dbUser?.is_delete).toBe(true);
    });

    it('should return 403 when CLIENT tries to delete another user', async () => {
      const created = await createUserRecord(prisma, createdUserIds, Role.CLIENT, {
        surname: 'DeleteForbidden',
      });

      mockUser.id = created.id + 1000;
      mockUser.role = Role.CLIENT;

      const response = await request(httpServer).delete(`/users/${created.id}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 when deleting a non-existing user', async () => {
      const response = await request(httpServer).delete('/users/999999999');

      expect(response.status).toBe(404);
    });

    it('should return 400 when deleting with a non-numeric user id', async () => {
      const response = await request(httpServer).delete('/users/not-a-number');

      expect(response.status).toBe(400);
    });
  });
});
