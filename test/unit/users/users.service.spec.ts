import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon from 'argon2';
import { Role } from '../../../src/auth/enums/index.js';
import { OrderBy } from '../../../src/common/enums/index.js';
import { ErrorsService } from '../../../src/common/errors.service.js';
import { PrismaService } from '../../../src/prisma/prisma.service.js';
import { UserOrderField } from '../../../src/users/dto/index.js';
import { UsersService } from '../../../src/users/users.service.js';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

jest.mock('argon2', () => ({
  hash: jest.fn(),
}));

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

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.resetAllMocks();

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
    jest.resetAllMocks();
  });

  describe('getUsers', () => {
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

      const result = await service.getUsers({
        orderParams: [{ field: UserOrderField.ID, order: OrderBy.ASC }],
      });

      expect(mockPrisma.users.findMany).toHaveBeenCalledWith({
        where: { is_delete: false },
        select: {
          id: true,
          role: true,
          name: true,
          surname: true,
          mail: true,
          phone_prefix: true,
          phone_number: true,
          is_delete: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: [{ id: OrderBy.ASC }],
      });
      expect(result).toEqual([expect.objectContaining({ role: Role.CLIENT })]);
    });

    it('applies the admin relation filter when role is ADMIN', async () => {
      mockPrisma.users.findMany.mockResolvedValue([]);

      await service.getUsers({ role: Role.ADMIN });

      expect(mockPrisma.users.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            is_delete: false,
            AND: [{ role: Role.ADMIN }, { admins: { some: { is_delete: false } } }],
          },
        }),
      );
    });

    it('applies the non-admin relation filter when role is CLIENT', async () => {
      mockPrisma.users.findMany.mockResolvedValue([]);

      await service.getUsers({ role: Role.CLIENT });

      expect(mockPrisma.users.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            is_delete: false,
            AND: [{ role: Role.CLIENT }, { admins: { none: { is_delete: false } } }],
          },
        }),
      );
    });

    it('applies string, numeric and ordering filters', async () => {
      mockPrisma.users.findMany.mockResolvedValue([]);

      await service.getUsers({
        id: 7,
        name: 'Pa',
        surname: 'Que',
        mail: 'a@a.com',
        phonePrefix: 34,
        phoneNumber: 123456789,
        orderParams: [
          { field: UserOrderField.NAME, order: OrderBy.DESC },
          { field: UserOrderField.PHONE_NUMBER, order: OrderBy.ASC },
        ],
      });

      expect(mockPrisma.users.findMany).toHaveBeenCalledWith({
        where: {
          is_delete: false,
          id: 7,
          name: { contains: 'Pa', mode: 'insensitive' },
          surname: { contains: 'Que', mode: 'insensitive' },
          mail: 'a@a.com',
          phone_prefix: 34,
          phone_number: 123456789,
        },
        select: {
          id: true,
          role: true,
          name: true,
          surname: true,
          mail: true,
          phone_prefix: true,
          phone_number: true,
          is_delete: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: [{ name: OrderBy.DESC }, { phone_number: OrderBy.ASC }],
      });
    });

    it('includes deleted users when checkDeleted is true', async () => {
      mockPrisma.users.findMany.mockResolvedValue([]);

      await service.getUsers({}, true);

      expect(mockPrisma.users.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });
  });

  describe('getUserById', () => {
    it('throws when no user is found', async () => {
      jest.spyOn(service, 'getUsers').mockResolvedValue([]);

      await expect(service.getUserById(1)).rejects.toThrow(NotFoundException);
    });

    it('throws when multiple users are found', async () => {
      jest.spyOn(service, 'getUsers').mockResolvedValue([{} as any, {} as any]);

      await expect(service.getUserById(1)).rejects.toThrow(InternalServerErrorException);
    });

    it('returns the user when exactly one result is found', async () => {
      const mockUser = { id: 1, role: Role.CLIENT } as any;
      jest.spyOn(service, 'getUsers').mockResolvedValue([mockUser]);

      await expect(service.getUserById(1)).resolves.toBe(mockUser);
      expect(service.getUsers).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('getUserByMail', () => {
    it('throws when no user is found', async () => {
      jest.spyOn(service, 'getUsers').mockResolvedValue([]);

      await expect(service.getUserByMail('a@a.com')).rejects.toThrow(NotFoundException);
    });

    it('throws when multiple users are found', async () => {
      jest.spyOn(service, 'getUsers').mockResolvedValue([{} as any, {} as any]);

      await expect(service.getUserByMail('a@a.com')).rejects.toThrow(InternalServerErrorException);
    });

    it('returns the user when exactly one result is found', async () => {
      const mockUser = { id: 1, mail: 'a@a.com', role: Role.CLIENT } as any;
      jest.spyOn(service, 'getUsers').mockResolvedValue([mockUser]);

      await expect(service.getUserByMail('a@a.com')).resolves.toBe(mockUser);
      expect(service.getUsers).toHaveBeenCalledWith({ mail: 'a@a.com' });
    });
  });

  describe('createUser', () => {
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

    it('uses the default password when one is not provided', async () => {
      jest.spyOn(service, 'getUsers').mockResolvedValue([]);
      (argon.hash as jest.Mock).mockResolvedValue('hashed-default');
      mockPrisma.users.create.mockResolvedValue({
        id: 1,
        role: Role.CLIENT,
        name: 'A',
        surname: 'B',
        mail: 'a@a.com',
        phone_prefix: 34,
        phone_number: 123456789,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await service.createUser({
        role: Role.CLIENT,
        name: 'A',
        surname: 'B',
        mail: 'a@a.com',
        phonePrefix: 34,
        phoneNumber: 123456789,
      } as any);

      expect(argon.hash).toHaveBeenCalledWith('1234');
    });

    it('creates a new admin user and an admin relation', async () => {
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

      expect(mockPrisma.admins.create).toHaveBeenCalledWith({
        data: {
          id: 1,
          complex_id: 9,
        },
      });
      expect(result.role).toBe(Role.ADMIN);
    });

    it('restores an existing deleted user when credentials already exist', async () => {
      jest.spyOn(service, 'getUsers').mockResolvedValue([{ id: 7, role: Role.CLIENT } as any]);
      (argon.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.users.update.mockResolvedValue({
        id: 7,
        role: Role.CLIENT,
        name: 'A',
        surname: 'B',
        mail: 'a@a.com',
        phone_prefix: 34,
        phone_number: 123456789,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.createUser({
        role: Role.CLIENT,
        name: 'A',
        surname: 'B',
        mail: 'a@a.com',
        phonePrefix: 34,
        phoneNumber: 123456789,
        password: 'pw',
      } as any);

      expect(mockPrisma.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 7 },
          data: expect.objectContaining({
            is_delete: false,
            password: 'hashed',
          }),
        }),
      );
      expect(result.id).toBe(7);
    });

    it('updates the role when restoring a user with a different role', async () => {
      jest.spyOn(service, 'getUsers').mockResolvedValue([{ id: 7, role: Role.CLIENT } as any]);
      const updateUserSpy = jest.spyOn(service, 'updateUser').mockResolvedValue({} as any);
      (argon.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.complexes.findUniqueOrThrow.mockResolvedValue({ id: 9 });
      mockPrisma.users.update.mockResolvedValue({
        id: 7,
        role: Role.CLIENT,
        name: 'A',
        surname: 'B',
        mail: 'a@a.com',
        phone_prefix: 34,
        phone_number: 123456789,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await service.createUser({
        role: Role.ADMIN,
        complexId: 9,
        name: 'A',
        surname: 'B',
        mail: 'a@a.com',
        phonePrefix: 34,
        phoneNumber: 123456789,
        password: 'pw',
      } as any);

      expect(updateUserSpy).toHaveBeenCalledWith(7, { role: Role.ADMIN });
    });

    it('throws the mapped error when admin complex validation fails', async () => {
      const error = new Error('db');
      const mappedError = new NotFoundException('Complex with ID 9 not found.');
      mockPrisma.complexes.findUniqueOrThrow.mockRejectedValue(error);
      mockErrorsService.dbError.mockImplementationOnce(() => {
        throw mappedError;
      });

      await expect(
        service.createUser({
          role: Role.ADMIN,
          complexId: 9,
          name: 'A',
          surname: 'B',
          mail: 'a@a.com',
          phonePrefix: 34,
          phoneNumber: 123456789,
          password: 'pw',
        } as any),
      ).rejects.toThrow(mappedError);
      expect(mockErrorsService.dbError).toHaveBeenCalledWith(error, {
        p2025: 'Complex with ID 9 not found.',
      });
    });

    it('throws the mapped error when restoring an existing user fails', async () => {
      const error = new Error('db');
      const mappedError = new ConflictException(
        'Credentials already exist. Please try again with different credentials.',
      );
      jest.spyOn(service, 'getUsers').mockResolvedValue([{ id: 7, role: Role.CLIENT } as any]);
      (argon.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.users.update.mockRejectedValue(error);
      mockErrorsService.dbError.mockImplementationOnce(() => {
        throw mappedError;
      });

      await expect(
        service.createUser({
          role: Role.CLIENT,
          name: 'A',
          surname: 'B',
          mail: 'a@a.com',
          phonePrefix: 34,
          phoneNumber: 123456789,
          password: 'pw',
        } as any),
      ).rejects.toThrow(mappedError);
      expect(mockErrorsService.dbError).toHaveBeenCalledWith(error, {
        p2002: 'Credentials already exist. Please try again with different credentials.',
      });
    });

    it('throws the mapped error when creating a new user fails', async () => {
      const error = new Error('db');
      const mappedError = new ConflictException(
        'Credentials already exist. Please try again with different credentials.',
      );
      jest.spyOn(service, 'getUsers').mockResolvedValue([]);
      (argon.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.users.create.mockRejectedValue(error);
      mockErrorsService.dbError.mockImplementationOnce(() => {
        throw mappedError;
      });

      await expect(
        service.createUser({
          role: Role.CLIENT,
          name: 'A',
          surname: 'B',
          mail: 'a@a.com',
          phonePrefix: 34,
          phoneNumber: 123456789,
          password: 'pw',
        } as any),
      ).rejects.toThrow(mappedError);
      expect(mockErrorsService.dbError).toHaveBeenCalledWith(error, {
        p2002: 'Credentials already exist. Please try again with different credentials.',
      });
    });
  });

  describe('updateUser', () => {
    it('updates the user and creates an admin relation when promoted to ADMIN', async () => {
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
      expect(mockPrisma.admins.create).toHaveBeenCalledWith({
        data: {
          id: 1,
          complex_id: 1,
        },
      });
      expect(result.role).toBe(Role.ADMIN);
    });

    it('restores an existing admin relation when keeping the ADMIN role', async () => {
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
      mockPrisma.admins.findUnique.mockResolvedValue({ id: 1, complex_id: 1, is_delete: true });

      await service.updateUser(1, {
        role: Role.ADMIN,
      } as any);

      expect(mockPrisma.admins.update).toHaveBeenCalledWith({
        where: {
          id_complex_id: {
            id: 1,
            complex_id: 1,
          },
        },
        data: expect.objectContaining({
          is_delete: false,
        }),
      });
    });

    it('deletes the admin relation when an admin is demoted', async () => {
      mockPrisma.users.update.mockResolvedValue({
        id: 1,
        role: Role.CLIENT,
        name: 'A',
        surname: 'B',
        mail: 'a@a.com',
        phone_prefix: 34,
        phone_number: 123456789,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockPrisma.admins.findUnique.mockResolvedValue({ id: 1, complex_id: 1 });

      const result = await service.updateUser(1, {
        role: Role.CLIENT,
      } as any);

      expect(mockPrisma.admins.update).toHaveBeenCalledWith({
        where: {
          id_complex_id: {
            id: 1,
            complex_id: 1,
          },
        },
        data: expect.objectContaining({
          is_delete: true,
        }),
      });
      expect(result.role).toBe(Role.CLIENT);
    });

    it('does not touch admin relations when role is not included', async () => {
      mockPrisma.users.update.mockResolvedValue({
        id: 1,
        role: Role.CLIENT,
        name: 'Updated',
        surname: 'B',
        mail: 'a@a.com',
        phone_prefix: 34,
        phone_number: 123456789,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.updateUser(1, {
        name: 'Updated',
      } as any);

      expect(mockPrisma.admins.findUnique).not.toHaveBeenCalled();
      expect(result.name).toBe('Updated');
    });

    it('throws when updateUser receives no body', async () => {
      const bodyError = new BadRequestException('No properties to update.');
      mockErrorsService.noBodyError.mockImplementationOnce(() => {
        throw bodyError;
      });

      await expect(service.updateUser(1, undefined as any)).rejects.toThrow(bodyError);
      expect(mockPrisma.users.update).not.toHaveBeenCalled();
    });

    it('throws the mapped error when updateUser fails', async () => {
      const error = new Error('db');
      const mappedError = new NotFoundException('User with ID 1 not found.');
      mockPrisma.users.update.mockRejectedValue(error);
      mockErrorsService.dbError.mockImplementationOnce(() => {
        throw mappedError;
      });

      await expect(service.updateUser(1, { name: 'Updated' } as any)).rejects.toThrow(mappedError);
      expect(mockErrorsService.dbError).toHaveBeenCalledWith(error, {
        p2002: 'Credentials already exist. Please try again with different credentials.',
        p2025: 'User with ID 1 not found.',
      });
    });
  });

  describe('deleteUser', () => {
    it('marks user and admin rows as deleted', async () => {
      await expect(service.deleteUser(1)).resolves.toBeNull();

      expect(mockPrisma.users.update).toHaveBeenCalled();
      expect(mockPrisma.admins.updateMany).toHaveBeenCalled();
    });

    it('throws the mapped error when deleteUser fails', async () => {
      const error = new Error('db');
      const mappedError = new NotFoundException('User with ID 1 not found.');
      mockPrisma.users.update.mockRejectedValue(error);
      mockErrorsService.dbError.mockImplementationOnce(() => {
        throw mappedError;
      });

      await expect(service.deleteUser(1)).rejects.toThrow(mappedError);
      expect(mockErrorsService.dbError).toHaveBeenCalledWith(error, {
        p2025: 'User with ID 1 not found.',
      });
    });
  });
});
