import { INestApplication } from '@nestjs/common';
import { UsersService } from '../../src/users/users.service';
import { Role } from '../../src/auth/enums';
import { PrismaService } from '../../src/prisma/prisma.service';
import { closeTestApp, createTestApp } from '../support/app';
import { resetDatabase } from '../support/database';
import { buildCreateUserDto, seedBaseCatalog, seedUser } from '../support/factories';

describe('UsersService integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let usersService: UsersService;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
    usersService = app.get(UsersService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await seedBaseCatalog(prisma);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('creates an admin user and stores the admin relation', async () => {
    const user = await usersService.createUser(
      buildCreateUserDto({
        role: Role.ADMIN,
        complexId: 1,
        mail: 'admin@sportying.test',
        phoneNumber: 600000201,
      }) as any,
    );

    expect(user.role).toBe(Role.ADMIN);

    const adminRelation = await prisma.admins.findUnique({
      where: {
        id_complex_id: {
          id: user.id,
          complex_id: 1,
        },
      },
    });

    expect(adminRelation).not.toBeNull();
    expect(adminRelation?.is_delete).toBe(false);
  });

  it('reactivates a deleted admin relation when a user becomes admin again', async () => {
    const user = await seedUser(prisma, {
      mail: 'reactivate@sportying.test',
      phone_number: 600000202,
      role: Role.CLIENT,
    });

    await prisma.admins.create({
      data: {
        id: user.id,
        complex_id: 1,
        is_delete: true,
      },
    });

    const updated = await usersService.updateUser(user.id, {
      role: Role.ADMIN,
    });

    expect(updated.role).toBe(Role.ADMIN);

    const adminRelation = await prisma.admins.findUniqueOrThrow({
      where: {
        id_complex_id: {
          id: user.id,
          complex_id: 1,
        },
      },
    });

    expect(adminRelation.is_delete).toBe(false);
  });

  it('marks user and admin records as deleted', async () => {
    const user = await usersService.createUser(
      buildCreateUserDto({
        role: Role.ADMIN,
        complexId: 1,
        mail: 'delete@sportying.test',
        phoneNumber: 600000203,
      }) as any,
    );

    await usersService.deleteUser(user.id);

    const storedUser = await prisma.users.findUniqueOrThrow({
      where: {
        id: user.id,
      },
    });
    const adminRelation = await prisma.admins.findUniqueOrThrow({
      where: {
        id_complex_id: {
          id: user.id,
          complex_id: 1,
        },
      },
    });

    expect(storedUser.is_delete).toBe(true);
    expect(adminRelation.is_delete).toBe(true);
  });
});
