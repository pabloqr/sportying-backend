//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation((config) => ({ config })),
}));

jest.mock('src/../prisma/generated/client', () => ({
  PrismaClient: jest.fn().mockImplementation(function (this: any, options: any) {
    this.options = options;
  }),
}));

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'src/../prisma/generated/client';
import { PrismaService } from 'src/prisma/prisma.service';

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('PrismaService', () => {
  it('creates PrismaClient with a PrismaPg adapter built from DATABASE_URL', () => {
    process.env.DATABASE_URL = 'postgres://localhost/test';

    const service = new PrismaService();

    expect(PrismaPg).toHaveBeenCalledWith({
      connectionString: 'postgres://localhost/test',
    });
    expect(PrismaClient).toHaveBeenCalled();
    expect(service).toBeInstanceOf(PrismaService);
  });
});
