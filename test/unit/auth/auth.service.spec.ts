import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon from 'argon2';
import { v4 as uuidV4 } from 'uuid';
import { AuthService } from '../../../src/auth/auth.service.js';
import { Role } from '../../../src/auth/enums/index.js';
import { PrismaService } from '../../../src/prisma/prisma.service.js';
import { UsersService } from '../../../src/users/users.service.js';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

jest.mock('argon2', () => ({
  verify: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

const mockPrisma = {
  devices: {
    findUnique: jest.fn(),
  },
  users: {
    update: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockJwt = {
  verifyAsync: jest.fn(),
  decode: jest.fn(),
  signAsync: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string) => (key === 'JWT_SECRET' ? 'access-secret' : 'refresh-secret')),
};

const mockUsersService = {
  createUser: jest.fn(),
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('verifies access tokens with the access secret', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 1, mail: 'a@a.com', role: 'CLIENT' });

      await expect(service.verifyToken('token')).resolves.toEqual({
        sub: 1,
        mail: 'a@a.com',
        role: 'CLIENT',
      });
      expect(mockJwt.verifyAsync).toHaveBeenCalledWith('token', {
        secret: 'access-secret',
      });
    });

    it('verifies refresh tokens with refresh secret', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 1, mail: 'a@a.com', role: 'CLIENT' });

      await expect(service.verifyToken('token', false)).resolves.toEqual({
        sub: 1,
        mail: 'a@a.com',
        role: 'CLIENT',
      });
      expect(mockJwt.verifyAsync).toHaveBeenCalledWith('token', {
        secret: 'refresh-secret',
      });
    });

    it('rethrows TokenExpiredError', async () => {
      mockJwt.verifyAsync.mockRejectedValue(new TokenExpiredError('expired', new Date()));

      await expect(service.verifyToken('token')).rejects.toBeInstanceOf(TokenExpiredError);
    });

    it('throws UnauthorizedException for invalid tokens', async () => {
      mockJwt.verifyAsync.mockRejectedValue(new Error('invalid'));

      await expect(service.verifyToken('token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validatePayload', () => {
    it('returns true for a complete payload', () => {
      expect(service.validatePayload({ sub: 1, mail: 'a@a.com', role: 'CLIENT' })).toBe(true);
    });

    it('returns false when a required field is missing', () => {
      expect(service.validatePayload({ sub: 1, mail: '', role: 'CLIENT' })).toBe(false);
    });
  });

  describe('validateApiKey', () => {
    it('throws when api key format is invalid', async () => {
      await expect(service.validateApiKey('bad')).rejects.toThrow(UnauthorizedException);
    });

    it('throws when the device does not exist', async () => {
      mockPrisma.devices.findUnique.mockResolvedValue(null);

      await expect(service.validateApiKey('id.secret')).rejects.toThrow(UnauthorizedException);
    });

    it('throws when the api key is not valid', async () => {
      mockPrisma.devices.findUnique.mockResolvedValue({
        id: 1,
        complex_id: 2,
        type: 'RAIN',
        status: 'NORMAL',
        api_key: 'hashed',
        created_at: new Date(),
        updated_at: new Date(),
      });
      (argon.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.validateApiKey('id.secret')).rejects.toThrow(UnauthorizedException);
    });

    it('returns the device dto when the key is valid', async () => {
      mockPrisma.devices.findUnique.mockResolvedValue({
        id: 1,
        complex_id: 2,
        type: 'RAIN',
        status: 'NORMAL',
        api_key: 'hashed',
        created_at: new Date(),
        updated_at: new Date(),
      });
      (argon.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.validateApiKey('id.secret');

      expect(result.id).toBe(1);
      expect(result.complexId).toBe(2);
    });
  });

  describe('token creation helpers', () => {
    it('signs access and refresh tokens and persists the refresh token', async () => {
      mockJwt.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');
      const updateSpy = jest.spyOn(service, 'updateDBRefreshToken').mockResolvedValue(undefined);

      const result = await service.getSignedTokens(1, 'a@a.com', Role.CLIENT);

      expect(updateSpy).toHaveBeenCalledWith(1, 'refresh-token');
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('hashes and stores the refresh token', async () => {
      (argon.hash as jest.Mock).mockResolvedValue('hashed-refresh');

      await service.updateDBRefreshToken(1, 'plain-token');

      expect(mockPrisma.users.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          refresh_token: 'hashed-refresh',
        }),
      });
    });

    it('builds an api key dto from uuid and argon hash', async () => {
      (uuidV4 as jest.Mock).mockReturnValueOnce('id-key').mockReturnValueOnce('secret-source');
      (argon.hash as jest.Mock).mockResolvedValue('hashed-secret');

      const result = await service.generateApiKey();

      expect(result.idKey).toBe('id-key');
      expect(result.secretKey).toBe('hashed-secret');
    });
  });

  describe('auth flows', () => {
    it('creates the user and returns tokens plus the created user on signup', async () => {
      mockUsersService.createUser.mockResolvedValue({
        id: 1,
        mail: 'a@a.com',
        role: Role.CLIENT,
      });
      jest.spyOn(service, 'getSignedTokens').mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
        expiresIn: 900,
      } as any);

      const result = await service.signup({
        name: 'A',
        surname: 'B',
        mail: 'a@a.com',
        phonePrefix: 34,
        phoneNumber: 123456789,
        password: 'pw',
      } as any);

      expect(result).toMatchObject({
        accessToken: 'a',
        refreshToken: 'r',
        user: { id: 1 },
      });
    });

    it('throws when signin user does not exist', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(null);

      await expect(service.signin({ mail: 'a@a.com', password: 'pw' } as any)).rejects.toThrow(UnauthorizedException);
    });

    it('throws when password does not match', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({
        id: 1,
        role: Role.CLIENT,
        name: 'A',
        surname: 'B',
        mail: 'a@a.com',
        phone_prefix: 34,
        phone_number: 123456789,
        password: 'hashed',
        created_at: new Date(),
        updated_at: new Date(),
      });
      (argon.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.signin({ mail: 'a@a.com', password: 'pw' } as any)).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens and the mapped user when signin succeeds', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({
        id: 1,
        role: Role.CLIENT,
        name: 'A',
        surname: 'B',
        mail: 'a@a.com',
        phone_prefix: 34,
        phone_number: 123456789,
        password: 'hashed',
        created_at: new Date(),
        updated_at: new Date(),
      });
      (argon.verify as jest.Mock).mockResolvedValue(true);
      jest.spyOn(service, 'getSignedTokens').mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
        expiresIn: 900,
      } as any);

      const result = await service.signin({
        mail: 'a@a.com',
        password: 'pw',
      } as any);

      expect(result).toMatchObject({
        accessToken: 'a',
        refreshToken: 'r',
        user: { id: 1, mail: 'a@a.com' },
      });
    });

    it('clears the stored refresh token on signout', async () => {
      await service.signout(5);

      expect(mockPrisma.users.updateMany).toHaveBeenCalledWith({
        where: {
          id: 5,
          refresh_token: { not: null },
        },
        data: expect.objectContaining({
          refresh_token: null,
        }),
      });
    });

    it('thows when the user is not found', async () => {
      jest.spyOn(service, 'verifyToken').mockResolvedValue({
        sub: 1,
        mail: 'a@a.com',
        role: 'CLIENT',
      });
      mockPrisma.users.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken({ refreshToken: 'token' } as any)).rejects.toThrow(UnauthorizedException);
    });

    it('thows when the user does not contain a valid refresh token', async () => {
      jest.spyOn(service, 'verifyToken').mockResolvedValue({
        sub: 1,
        mail: 'a@a.com',
        role: 'CLIENT',
      });
      mockPrisma.users.findUnique.mockResolvedValue({
        id: 1,
        mail: 'a@a.com',
        refresh_token: null,
      });

      await expect(service.refreshToken({ refreshToken: 'token' } as any)).rejects.toThrow(UnauthorizedException);
    });

    it('thows when the refresh token does not match', async () => {
      jest.spyOn(service, 'verifyToken').mockResolvedValue({
        sub: 1,
        mail: 'a@a.com',
        role: 'CLIENT',
      });
      mockPrisma.users.findUnique.mockResolvedValue({
        id: 1,
        mail: 'a@a.com',
        refresh_token: 'hashed',
      });
      (argon.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshToken({ refreshToken: 'token' } as any)).rejects.toThrow(UnauthorizedException);
    });

    it('thows when the refresh token payload is not valid', async () => {
      jest.spyOn(service, 'verifyToken').mockResolvedValue({
        sub: 1,
        mail: 'a@a.com',
        role: 'CLIENT',
      });
      mockPrisma.users.findUnique.mockResolvedValue({
        id: 1,
        mail: 'a@a.com',
        refresh_token: 'hashed',
      });
      (argon.verify as jest.Mock).mockResolvedValue(true);
      jest.spyOn(service, 'validatePayload').mockReturnValue(false);

      await expect(service.refreshToken({ refreshToken: 'token' } as any)).rejects.toThrow(UnauthorizedException);
    });

    it('returns new signed tokens when refresh token is valid', async () => {
      jest.spyOn(service, 'verifyToken').mockResolvedValue({
        sub: 1,
        mail: 'a@a.com',
        role: 'CLIENT',
      });
      mockPrisma.users.findUnique.mockResolvedValue({
        id: 1,
        mail: 'a@a.com',
        refresh_token: 'hashed',
      });
      (argon.verify as jest.Mock).mockResolvedValue(true);
      jest.spyOn(service, 'validatePayload').mockReturnValue(true);
      jest.spyOn(service, 'getSignedTokens').mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresIn: 900,
      } as any);

      await expect(service.refreshToken({ refreshToken: 'token' } as any)).resolves.toMatchObject({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
    });
  });
});
