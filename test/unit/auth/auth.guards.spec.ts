import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AccessControlService } from '../../../src/auth/access-control.service.js';
import { Role } from '../../../src/auth/enums/index.js';
import { JwtGuard, RolesGuard } from '../../../src/auth/guard/index.js';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

const mockReflector = {
  getAllAndOverride: jest.fn(),
};

const mockAccessControlService = {
  isAuthorized: jest.fn(),
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('Auth guards', () => {
  const buildContext = (request: Record<string, unknown> = {}) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('JwtGuard', () => {
    let guard: JwtGuard;

    beforeEach(() => {
      guard = new JwtGuard(mockReflector as unknown as Reflector);
    });

    it('returns true immediately when the route is public', () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);

      expect(guard.canActivate(buildContext())).toBe(true);
    });

    it('delegates to the base passport guard when the route is not public', () => {
      const canActivateSpy = jest.spyOn(AuthGuard('jwt').prototype, 'canActivate').mockReturnValue(true);
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = buildContext();

      expect(guard.canActivate(context)).toBe(true);
      expect(canActivateSpy).toHaveBeenCalledWith(context);
    });
  });

  describe('RolesGuard', () => {
    let guard: RolesGuard;

    beforeEach(() => {
      guard = new RolesGuard(
        mockReflector as unknown as Reflector,
        mockAccessControlService as unknown as AccessControlService,
      );
    });

    it('allows access when no roles are required', () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      expect(guard.canActivate(buildContext())).toBe(true);
    });

    it('falls back to NONE when the request user has no role', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['USER']);
      mockAccessControlService.isAuthorized.mockReturnValue(false);
      const context = buildContext({ user: undefined });

      expect(guard.canActivate(context)).toBe(false);
      expect(mockAccessControlService.isAuthorized).toHaveBeenCalledWith({
        currentRole: Role.NONE,
        requiredRole: undefined,
      });
    });

    it('returns true when at least one required role is authorized', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['ADMIN', 'MANAGER']);
      mockAccessControlService.isAuthorized.mockReturnValueOnce(false).mockReturnValueOnce(true);
      const context = buildContext({ user: { role: 'CLIENT' } });

      expect(guard.canActivate(context)).toBe(true);
      expect(mockAccessControlService.isAuthorized).toHaveBeenNthCalledWith(1, {
        currentRole: Role.CLIENT,
        requiredRole: Role.ADMIN,
      });
      expect(mockAccessControlService.isAuthorized).toHaveBeenNthCalledWith(2, {
        currentRole: Role.CLIENT,
        requiredRole: undefined,
      });
    });
  });
});
