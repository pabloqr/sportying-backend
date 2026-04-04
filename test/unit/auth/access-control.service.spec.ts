import { Test, TestingModule } from '@nestjs/testing';
import { AccessControlService } from '../../../src/auth/access-control.service';
import { Role } from '../../../src/auth/enums';

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('AccessControlService', () => {
  let service: AccessControlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccessControlService],
    }).compile();

    service = module.get<AccessControlService>(AccessControlService);
  });

  it('authorizes higher roles within the same hierarchy', () => {
    expect(
      service.isAuthorized({
        currentRole: Role.SUPERADMIN,
        requiredRole: Role.ADMIN,
      }),
    ).toBe(true);
  });

  it('authorizes equal roles within the same hierarchy', () => {
    expect(
      service.isAuthorized({
        currentRole: Role.CLIENT,
        requiredRole: Role.CLIENT,
      }),
    ).toBe(true);
  });

  it('rejects lower roles within the same hierarchy', () => {
    expect(
      service.isAuthorized({
        currentRole: Role.CLIENT,
        requiredRole: Role.ADMIN,
      }),
    ).toBe(false);
  });

  it('rejects roles across different hierarchies', () => {
    expect(
      service.isAuthorized({
        currentRole: Role.DEVICE,
        requiredRole: Role.CLIENT,
      }),
    ).toBe(false);
  });
});
