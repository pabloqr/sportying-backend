import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../src/auth/auth.controller';
import { AuthService } from '../../../src/auth/auth.service';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

const mockAuthService = {
  signup: jest.fn(),
  signin: jest.fn(),
  refreshToken: jest.fn(),
  signout: jest.fn(),
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates signup to AuthService', async () => {
    const dto = { mail: 'user@test.com', password: 'secret123' };
    mockAuthService.signup.mockResolvedValue({ id: 1 });

    await expect(controller.signup(dto as any)).resolves.toEqual({ id: 1 });
    expect(mockAuthService.signup).toHaveBeenCalledWith(dto);
  });

  it('delegates signin to AuthService', async () => {
    const dto = { mail: 'user@test.com', password: 'secret123' };
    mockAuthService.signin.mockResolvedValue({ accessToken: 'token' });

    await expect(controller.signin(dto as any)).resolves.toEqual({
      accessToken: 'token',
    });
    expect(mockAuthService.signin).toHaveBeenCalledWith(dto);
  });

  it('delegates refreshToken to AuthService', async () => {
    const dto = { refreshToken: 'refresh-token' };
    mockAuthService.refreshToken.mockResolvedValue({ accessToken: 'new-token' });

    await expect(controller.refreshToken(dto as any)).resolves.toEqual({
      accessToken: 'new-token',
    });
    expect(mockAuthService.refreshToken).toHaveBeenCalledWith(dto);
  });

  it('delegates signout to AuthService with the authenticated user id', async () => {
    mockAuthService.signout.mockResolvedValue(undefined);

    await expect(controller.signout(7)).resolves.toBeUndefined();
    expect(mockAuthService.signout).toHaveBeenCalledWith(7);
  });
});
