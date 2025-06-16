import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import * as pactum from 'pactum';
import { SigninAuthDto, SignupAuthDto } from '../src/auth/dto';

describe('App e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      }),
    );
    await app.init();
    await app.listen(3000);

    prisma = app.get(PrismaService);
    await prisma.cleanDb();

    pactum.request.setBaseUrl('http://localhost:3000');
  });

  afterAll(() => {
    app.close();
  });

  describe('Auth', () => {
    describe('Signup', () => {
      const dto: SignupAuthDto = {
        password: '1234',
        name: 'Test',
        surname: 'Test',
        mail: 'test@gmail.com',
        phone_prefix: 34,
        phone_number: 111111111,
      };

      it('should fail if no body', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .expectStatus(HttpStatus.BAD_REQUEST);
      });

      it('should fail if mail is empty', () => {
        const { mail, ...dtoWithoutMail } = dto;
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(dtoWithoutMail)
          .expectStatus(HttpStatus.BAD_REQUEST);
      });

      it('should fail if password is empty', () => {
        const { password, ...dtoWithoutPassword } = dto;
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(dtoWithoutPassword)
          .expectStatus(HttpStatus.BAD_REQUEST);
      });

      it('should fail if name is empty', () => {
        const { name, ...dtoWithoutName } = dto;
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(dtoWithoutName)
          .expectStatus(HttpStatus.BAD_REQUEST);
      });

      it('should not fail if surname is empty', () => {
        const { surname, ...dtoWithoutSurname } = dto;
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({
            ...dtoWithoutSurname,
            mail: 'test2@gmail.com',
            phone_number: 222222222,
          })
          .expectStatus(HttpStatus.CREATED);
      });

      it('should fail if phone_prefix is empty', () => {
        const { phone_prefix, ...dtoWithoutPrefix } = dto;
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(dtoWithoutPrefix)
          .expectStatus(HttpStatus.BAD_REQUEST);
      });

      it('should fail if phone_number is empty', () => {
        const { phone_number, ...dtoWithoutNumber } = dto;
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(dtoWithoutNumber)
          .expectStatus(HttpStatus.BAD_REQUEST);
      });

      it('should fail if mail is invalid', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({
            ...dto,
            mail: 'invalid-email',
          })
          .expectStatus(HttpStatus.BAD_REQUEST);
      });

      it('should fail if phone_prefix is invalid', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({
            ...dto,
            phone_prefix: -1,
          })
          .expectStatus(HttpStatus.BAD_REQUEST);
      });

      it('should fail if phone_number is invalid', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({
            ...dto,
            phone_number: 123,
          })
          .expectStatus(HttpStatus.BAD_REQUEST);
      });

      it('should signup', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(dto)
          .expectStatus(HttpStatus.CREATED);
      });

      it('should fail if mail exists with different phone', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({
            ...dto,
            phone_number: 333333333,
          })
          .expectStatus(HttpStatus.CONFLICT);
      });

      it('should fail if phone exists with different mail', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({
            ...dto,
            mail: 'test3@gmail.com',
          })
          .expectStatus(HttpStatus.CONFLICT);
      });
    });

    describe('Signin', () => {
      const dto: SigninAuthDto = {
        mail: 'test@gmail.com',
        password: '1234',
      };

      it('should fail if mail is empty', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({
            password: dto.password,
          })
          .expectStatus(HttpStatus.BAD_REQUEST);
      });

      it('should fail if password is empty', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({
            mail: dto.mail,
          })
          .expectStatus(HttpStatus.BAD_REQUEST);
      });

      it('should fail if no body', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .expectStatus(HttpStatus.BAD_REQUEST);
      });

      it('should fail if mail is invalid', () => {
        return pactum.spec().post('/auth/signin').withBody({
          mail: 'test',
          password: dto.password,
        });
      });

      it('should fail if password is invalid', () => {
        return pactum.spec().post('/auth/signin').withBody({
          mail: dto.mail,
          password: '123',
        });
      });

      it('should fail if mail and password are invalid', () => {
        return pactum.spec().post('/auth/signin').withBody({
          mail: 'test',
          password: '123',
        });
      });

      it('should signin', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody(dto)
          .expectStatus(HttpStatus.OK)
          .stores('token', 'access_token');
      });
    });
  });
});
