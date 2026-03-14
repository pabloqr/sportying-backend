jest.mock('argon2', () => ({
  hash: jest.fn(),
}));

import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon from 'argon2';
import { UsersService } from '../../../src/users/users.service';
import { Role } from '../../../src/auth/enums';
import { ErrorsService } from '../../../src/common/errors.service';
import { PrismaService } from '../../../src/prisma/prisma.service';

const mockPrisma = {
  users: {
    findMany: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  complexes: {
    findUniqueOrThrow: jest.fn(),
  },
  admins: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockErrorsService = {
  dbError: jest.fn(),
  noBodyError: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ErrorsService, useValue: mockErrorsService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('queries active users by default and maps the role', async () => {
    mockPrisma.users.findMany.mockResolvedValue([
      {
        id: 1,
        role: Role.CLIENT,
        name: 'A',
        surname: 'B',
        mail: 'a@a.com',
        phone_prefix: 34,
        phone_number: 123456789,
        is_delete: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    const result = await service.getUsers({});

    expect(result[0].role).toBe(Role.CLIENT);
  });

  it('throws when no user is found by id', async () => {
    jest.spyOn(service, 'getUsers').mockResolvedValue([]);

    await expect(service.getUserById(1)).rejects.toThrow(NotFoundException);
  });

  it('throws when multiple users are found by id', async () => {
    jest.spyOn(service, 'getUsers').mockResolvedValue([{} as any, {} as any]);

    await expect(service.getUserById(1)).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('throws when creating an admin without complexId', async () => {
    await expect(
      service.createUser({
        role: Role.ADMIN,
        name: 'A',
        surname: 'B',
        mail: 'a@a.com',
        phonePrefix: 34,
        phoneNumber: 123456789,
        password: 'pw',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates a new user and an admin entry when role is ADMIN', async () => {
    jest.spyOn(service, 'getUsers').mockResolvedValue([]);
    mockPrisma.complexes.findUniqueOrThrow.mockResolvedValue({ id: 9 });
    (argon.hash as jest.Mock).mockResolvedValue('hashed');
    mockPrisma.users.create.mockResolvedValue({
      id: 1,
      role: Role.ADMIN,
      name: 'A',
      surname: 'B',
      mail: 'a@a.com',
      phone_prefix: 34,
      phone_number: 123456789,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const result = await service.createUser({
      role: Role.ADMIN,
      complexId: 9,
      name: 'A',
      surname: 'B',
      mail: 'a@a.com',
      phonePrefix: 34,
      phoneNumber: 123456789,
      password: 'pw',
    } as any);

    expect(mockPrisma.admins.create).toHaveBeenCalled();
    expect(result.role).toBe(Role.ADMIN);
  });

  it('updates the user and creates admin relation when promoted to ADMIN', async () => {
    (argon.hash as jest.Mock).mockResolvedValue('hashed');
    mockPrisma.users.update.mockResolvedValue({
      id: 1,
      role: Role.ADMIN,
      name: 'A',
      surname: 'B',
      mail: 'a@a.com',
      phone_prefix: 34,
      phone_number: 123456789,
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockPrisma.admins.findUnique.mockResolvedValue(null);

    const result = await service.updateUser(1, {
      role: Role.ADMIN,
      password: 'pw',
    } as any);

    expect(mockErrorsService.noBodyError).toHaveBeenCalled();
    expect(mockPrisma.admins.create).toHaveBeenCalled();
    expect(result.role).toBe(Role.ADMIN);
  });

  it('marks user and admin rows as deleted', async () => {
    await expect(service.deleteUser(1)).resolves.toBeNull();

    expect(mockPrisma.users.update).toHaveBeenCalled();
    expect(mockPrisma.admins.updateMany).toHaveBeenCalled();
  });
});
