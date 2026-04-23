import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from 'src/auth/auth.service';
import { ApiKeyStrategy, JwtStrategy, RefreshJwtStrategy } from 'src/auth/strategy';
import { PrismaService } from 'src/prisma/prisma.service';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

const mockConfigService = {
  get: jest.fn((key: string) => key),
};

const mockPrisma = {
  users: {
    findUnique: jest.fn(),
  },
};

const mockAuthService = {
  validateApiKey: jest.fn(),
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('Auth strategies', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('JwtStrategy', () => {
    let strategy: JwtStrategy;

    beforeEach(() => {
      strategy = new JwtStrategy(mockConfigService as unknown as ConfigService, mockPrisma as unknown as PrismaService);
    });

    it('returns null when the user does not exist', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(null);

      await expect(strategy.validate({ sub: 1, mail: 'user@test.com', role: 'USER' })).resolves.toBeNull();
    });

    it('returns null when the stored role differs from the payload role', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({
        id: 1,
        role: 'ADMIN',
      });

      await expect(strategy.validate({ sub: 1, mail: 'user@test.com', role: 'USER' })).resolves.toBeNull();
    });

    it('returns the user without password or refresh token when validation succeeds', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({
        id: 1,
        mail: 'user@test.com',
        role: 'USER',
        password: 'secret',
        refresh_token: 'token',
      });

      await expect(strategy.validate({ sub: 1, mail: 'user@test.com', role: 'USER' })).resolves.toEqual({
        id: 1,
        mail: 'user@test.com',
        role: 'USER',
      });
    });
  });

  describe('RefreshJwtStrategy', () => {
    let strategy: RefreshJwtStrategy;

    beforeEach(() => {
      strategy = new RefreshJwtStrategy(
        mockConfigService as unknown as ConfigService,
        mockPrisma as unknown as PrismaService,
      );
    });

    it('returns null when the user does not exist', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(null);

      await expect(strategy.validate({ sub: 1, mail: 'user@test.com' })).resolves.toBeNull();
    });

    it('returns the user without password or refresh token when validation succeeds', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({
        id: 1,
        mail: 'user@test.com',
        role: 'USER',
        password: 'secret',
        refresh_token: 'token',
      });

      await expect(strategy.validate({ sub: 1, mail: 'user@test.com' })).resolves.toEqual({
        id: 1,
        mail: 'user@test.com',
        role: 'USER',
      });
    });
  });

  describe('ApiKeyStrategy', () => {
    let strategy: ApiKeyStrategy;

    beforeEach(() => {
      strategy = new ApiKeyStrategy(mockAuthService as unknown as AuthService);
    });

    it('throws when the api key header is missing', async () => {
      await expect(strategy.validate({ headers: {} })).rejects.toThrow(UnauthorizedException);
    });

    it('delegates api key validation to the auth service', async () => {
      mockAuthService.validateApiKey.mockResolvedValue({ id: 1 });

      await expect(strategy.validate({ headers: { 'x-api-key': 'api-key' } })).resolves.toEqual({ id: 1 });
      expect(mockAuthService.validateApiKey).toHaveBeenCalledWith('api-key');
    });
  });
});
