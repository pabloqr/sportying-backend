import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from 'src/auth/enums';
import { UsersController } from 'src/users/users.controller';
import { UsersService } from 'src/users/users.service';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

const mockUsersService = {
  getUsers: jest.fn(),
  getUserById: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates getUsers to UsersService', async () => {
    const query = { role: Role.CLIENT };
    mockUsersService.getUsers.mockResolvedValue([{ id: 1 }]);

    await expect(controller.getUsers(query as any)).resolves.toEqual([{ id: 1 }]);
    expect(mockUsersService.getUsers).toHaveBeenCalledWith(query);
  });

  it('returns the requested user when a client accesses their own user', async () => {
    mockUsersService.getUserById.mockResolvedValue({ id: 7 });

    await expect(controller.getUser(7, 7, Role.CLIENT)).resolves.toEqual({
      id: 7,
    });
    expect(mockUsersService.getUserById).toHaveBeenCalledWith(7);
  });

  it('throws when a client accesses a different user', async () => {
    await expect(controller.getUser(8, 7, Role.CLIENT)).rejects.toThrow(ForbiddenException);
    expect(mockUsersService.getUserById).not.toHaveBeenCalled();
  });

  it('allows admins to access any user', async () => {
    mockUsersService.getUserById.mockResolvedValue({ id: 8 });

    await expect(controller.getUser(8, 7, Role.ADMIN)).resolves.toEqual({
      id: 8,
    });
    expect(mockUsersService.getUserById).toHaveBeenCalledWith(8);
  });

  it('delegates createUser to UsersService', async () => {
    const dto = { role: Role.CLIENT, mail: 'client@test.com' };
    mockUsersService.createUser.mockResolvedValue({ id: 3 });

    await expect(controller.createUser(dto as any)).resolves.toEqual({ id: 3 });
    expect(mockUsersService.createUser).toHaveBeenCalledWith(dto);
  });

  it('delegates updateUser when the authenticated client updates their own user', async () => {
    const dto = { name: 'Updated' };
    mockUsersService.updateUser.mockResolvedValue({ id: 7, ...dto });

    await expect(controller.updateUser(7, 7, Role.CLIENT, dto as any)).resolves.toEqual({
      id: 7,
      ...dto,
    });
    expect(mockUsersService.updateUser).toHaveBeenCalledWith(7, dto);
  });

  it('throws when a client tries to update a different user', async () => {
    await expect(controller.updateUser(8, 7, Role.CLIENT, { name: 'Updated' } as any)).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockUsersService.updateUser).not.toHaveBeenCalled();
  });

  it('delegates deleteUser when the authenticated client deletes their own user', async () => {
    mockUsersService.deleteUser.mockResolvedValue(null);

    await expect(controller.deleteUser(7, 7, Role.CLIENT)).resolves.toBeNull();
    expect(mockUsersService.deleteUser).toHaveBeenCalledWith(7);
  });

  it('throws when a client tries to delete a different user', async () => {
    await expect(controller.deleteUser(8, 7, Role.CLIENT)).rejects.toThrow(ForbiddenException);
    expect(mockUsersService.deleteUser).not.toHaveBeenCalled();
  });
});
