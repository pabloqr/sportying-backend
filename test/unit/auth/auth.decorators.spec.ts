import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import { Reflector } from '@nestjs/core';
import 'reflect-metadata';
import { GetTokens, GetUser, IS_PUBLIC_KEY, Public, ROLES_KEY, Roles } from '../../../src/auth/decorator/index.js';
import { Role } from '../../../src/auth/enums/index.js';

//--------------------------------------------------------------------------------------------------------------------//
// Helpers
//--------------------------------------------------------------------------------------------------------------------//

function getParamDecoratorFactory(decoratorFactory: (...args: any[]) => ParameterDecorator) {
  class TestController {
    handler(@decoratorFactory() _value: unknown) {}
  }

  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'handler');
  const firstParamMetadata = Object.values(metadata)[0] as { factory: (...args: any[]) => unknown };

  return firstParamMetadata.factory;
}

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('Auth decorators', () => {
  describe('GetUser', () => {
    const factory = getParamDecoratorFactory(GetUser);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            id: 1,
            mail: 'user@test.com',
            role: 'ADMIN',
            password: 'secret',
            refresh_token: 'token',
          },
        }),
      }),
    } as any;

    it('returns only the requested user property when data is provided', () => {
      expect(factory('mail', context)).toBe('user@test.com');
    });

    it('removes private fields when no property is requested', () => {
      expect(factory(undefined, context)).toEqual({
        id: 1,
        mail: 'user@test.com',
        role: 'ADMIN',
      });
    });
  });

  describe('GetTokens', () => {
    const factory = getParamDecoratorFactory(GetTokens);

    it('extracts the access and refresh tokens from the request', () => {
      const result = factory(null, {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Bearer access-token' },
            body: { refreshToken: 'refresh-token' },
          }),
        }),
      } as any);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('Public', () => {
    it('stores the public metadata flag on the decorated handler', () => {
      class TestController {
        @Public()
        handler() {}
      }

      const reflector = new Reflector();
      expect(reflector.get(IS_PUBLIC_KEY, TestController.prototype.handler)).toBe(true);
    });
  });

  describe('Roles', () => {
    it('stores the required roles on the decorated handler', () => {
      class TestController {
        @Roles(Role.ADMIN, Role.SUPERADMIN)
        handler() {}
      }

      const reflector = new Reflector();
      expect(reflector.get(ROLES_KEY, TestController.prototype.handler)).toEqual([Role.ADMIN, Role.SUPERADMIN]);
    });
  });
});
