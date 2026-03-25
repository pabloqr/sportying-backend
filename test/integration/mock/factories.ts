import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from 'src/auth/enums';
import { PrismaService } from 'src/prisma/prisma.service';

export const mockUser = {
  id: 9999,
  role: Role.SUPERADMIN,
};

export const resetMockUser = () => {
  mockUser.id = 9999;
  mockUser.role = Role.SUPERADMIN;
};

export const createIntegrationApp = async (
  metadata: ModuleMetadata,
): Promise<{
  app: INestApplication;
  httpServer: any;
  prisma?: PrismaService;
  moduleRef: TestingModule;
}> => {
  const moduleRef = await Test.createTestingModule(metadata).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.use((req: any, _res: any, next: () => void) => {
    req.user = { ...mockUser };
    next();
  });

  await app.init();

  let prisma: PrismaService | undefined;
  try {
    prisma = moduleRef.get<PrismaService>(PrismaService, { strict: false });
  } catch {
    prisma = undefined;
  }

  return {
    app,
    httpServer: app.getHttpServer(),
    prisma,
    moduleRef,
  };
};
