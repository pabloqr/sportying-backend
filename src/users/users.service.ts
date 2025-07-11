import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as argon from 'argon2';
import { CreateUserDto, GetUsersDto, UpdateUserDto } from './dto';
import { Role } from '../auth/enums/role.enum';
import { ResponseUserDto } from '../common/dto';
import { ErrorsService } from '../common/errors.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private errorsService: ErrorsService,
  ) {}

  /**
   * Retrieves a list of users based on the specified criteria in the data transfer object (DTO).
   *
   * @param {GetUsersDto} dto - The data transfer object containing filters for retrieving users, such as role, name,
   * or surname.
   * @param checkDeleted Flag that determines if the method returns deleted users.
   * @return {Promise<Array<ResponseUserDto>>} A promise that resolves to an array of user objects, filtered and
   * formatted based on the specified criteria.
   */
  async getUsers(
    dto: GetUsersDto,
    checkDeleted: boolean = false,
  ): Promise<Array<ResponseUserDto>> {
    // Se construye el objeto 'where' para establecer las condiciones de la consulta
    const where: Prisma.usersWhereInput = {
      // Se evita obtener los usuarios eliminados
      ...(!checkDeleted && { is_delete: false }),

      ...(dto.id !== undefined && { id: dto.id }),

      // Se establece la condición para obtener el rol
      ...(dto.role !== undefined && {
        admins: dto.role === Role.ADMIN ? { some: {} } : { none: {} },
      }),

      // Se establecen las condiciones para los campos de tipo 'string'
      ...(dto.name !== undefined && {
        name: { contains: dto.name, mode: 'insensitive' },
      }),
      ...(dto.surname !== undefined && {
        surname: { contains: dto.surname, mode: 'insensitive' },
      }),

      ...(dto.mail !== undefined && { mail: dto.mail }),
      ...(dto.phonePrefix !== undefined && { phone_prefix: dto.phonePrefix }),
      ...(dto.phoneNumber !== undefined && { phone_number: dto.phoneNumber }),
    };

    // Se realiza la consulta especificando las columnas para evitar devolver las credenciales privadas
    const users = await this.prisma.users.findMany({
      where,
      select: {
        id: true,
        role: true,
        name: true,
        surname: true,
        mail: true,
        phone_prefix: true,
        phone_number: true,
        is_delete: true,
        created_at: true,
        updated_at: true,
      },
    });

    // Se formatea el campo para el rol de usuario
    return users.map((user) => ({
      ...user,
      role: user.role as Role,
    }));
  }

  /**
   * Creates a new user in the database. If no password is provided, a default password is set.
   * The method hashes the password, stores the user information in the database, and returns the created user object.
   * If the user has a role of administrator, an additional entry in the administrator table is created.
   *
   * @param {CreateUserDto} dto - Data transfer object containing user information such as name, surname, email,
   * phone details, and role.
   * @return {Promise<ResponseUserDto>} An object representing the created user, including their ID, name, surname,
   * email, phone details, creation timestamp, update timestamp, and role.
   * @throws {Error} Rethrows a generic error or a specific Prisma client error if the database operation fails.
   */
  async createUser(dto: CreateUserDto): Promise<ResponseUserDto> {
    // En caso de no proporcionar una contraseña, se establece una por defecto
    if (!dto.password) {
      dto.password = '1234';
    }

    // Se verifica si hay un usuario con los datos proporcionados almacenado en la BD
    const existingUser = await this.getUsers({ mail: dto.mail }, true);

    if (existingUser.length > 0) {
      // Si el usuario se encuentra en la BD, se actualiza su estado para habilitarlo
      try {
        const user = await this.prisma.users.update({
          where: {
            id: existingUser[0].id,
          },
          data: {
            is_delete: false,
            password: await argon.hash(dto.password),
            name: dto.name,
            surname: dto.surname,
            phone_prefix: dto.phonePrefix,
            phone_number: dto.phoneNumber,
          },
          select: {
            id: true,
            role: true,
            name: true,
            surname: true,
            mail: true,
            phone_prefix: true,
            phone_number: true,
            created_at: true,
            updated_at: true,
          },
        });

        return {
          ...user,
          role: user.role as Role,
        };
      } catch (error) {
        this.errorsService.dbError(error, {
          p2002:
            'Credentials already exist. Please try again with different credentials.',
        });

        throw error;
      }
    } else {
      // Si no se encuentra en la BD, se trata de almacenarlo
      try {
        // Se crea la entrada para el usuario en la BD
        const user = await this.prisma.users.create({
          data: {
            password: await argon.hash(dto.password),
            name: dto.name,
            surname: dto.surname,
            mail: dto.mail,
            phone_prefix: dto.phonePrefix,
            phone_number: dto.phoneNumber,
          },
          select: {
            id: true,
            role: true,
            name: true,
            surname: true,
            mail: true,
            phone_prefix: true,
            phone_number: true,
            created_at: true,
            updated_at: true,
          },
        });

        // Se obtiene el rol del usuario
        const role = user.role as Role;

        // Se verifica si el usuario que se crea es un administrador
        if (role === Role.ADMIN) {
          // Se crea la entrada para el administrador en la BD
          await this.prisma.admins.create({
            data: {
              id: user.id,
              complex_id: 1,
            },
          });
        }

        // Se devuelve el objeto creado formateando el campo para el rol de usuario
        return {
          ...user,
          role,
        };
      } catch (error) {
        this.errorsService.dbError(error, {
          p2002:
            'Credentials already exist. Please try again with different credentials.',
        });

        throw error;
      }
    }
  }

  /**
   * Retrieves a user based on the given ID.
   * Throws an exception if no user or multiple users are found with the same ID.
   *
   * @param {number} userId - The ID of the user to be retrieved.
   * @return {Promise<ResponseUserDto>} A promise that resolves to the user object.
   * @throws {NotFoundException} If no user is found with the given ID.
   * @throws {InternalServerErrorException} If multiple users are found with the same ID.
   */
  async getUser(userId: number): Promise<ResponseUserDto> {
    // Se trata de obtener el usuario con el 'id' dado
    const result = await this.getUsers({ id: userId });

    // Se verifican los elementos obtenidos
    if (result.length === 0) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    } else if (result.length > 1) {
      throw new InternalServerErrorException(
        `Multiple users found with ID ${userId}.`,
      );
    }

    return result[0];
  }

  async updateUser(userId: number, dto: UpdateUserDto): Promise<ResponseUserDto> {
    this.errorsService.noBodyError(dto);

    // Se establecen las propiedades a actualizar
    const data = {
      ...(dto.password !== undefined && {
        password: await argon.hash(dto.password),
      }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.surname !== undefined && { surname: dto.surname }),
      ...(dto.mail !== undefined && { mail: dto.mail }),
      ...(dto.phonePrefix !== undefined && { phone_prefix: dto.phonePrefix }),
      ...(dto.phoneNumber !== undefined && { phone_number: dto.phoneNumber }),
    };

    try {
      // Se actualiza la entrada del usuario
      const user = await this.prisma.users.update({
        where: {
          id: userId,
          is_delete: false,
        },
        data,
      });

      // Se verifica el rol del usuario
      if (dto.role !== undefined) {
        // Se trata de obtener la entrada en la tabla de administradores para el usuario actual
        const isAdmin = await this.prisma.admins.findUnique({
          where: {
            id_complex_id: {
              id: user.id,
              complex_id: 1,
            },
          },
        });

        if (dto.role === Role.ADMIN) {
          // Si el rol nuevo es de administrador y no está almacenado, se crea la entrada en la tabla de administradores
          if (isAdmin === undefined) {
            await this.prisma.admins.create({
              data: {
                id: user.id,
                complex_id: 1,
              },
            });
          } else {
            await this.prisma.admins.update({
              where: {
                id_complex_id: {
                  id: user.id,
                  complex_id: 1,
                },
              },
              data: {
                is_delete: false,
              },
            });
          }
        } else if (isAdmin !== undefined) {
          // Si el rol nuevo es de usuario y está almacenado, se elimina la entrada de la tabla de administradores
          await this.prisma.admins.update({
            where: {
              id_complex_id: {
                id: user.id,
                complex_id: 1,
              },
            },
            data: {
              is_delete: true,
            },
          });
        }
      }

      return {
        ...user,
        role: user.role as Role,
      };
    } catch (error) {
      this.errorsService.dbError(error, {
        p2002:
          'Credentials already exist. Please try again with different credentials.',
        p2025: `User with ID ${userId} not found.`,
      });

      throw error;
    }
  }

  async deleteUser(userId: number): Promise<null> {
    try {
      await this.prisma.users.update({
        where: { id: userId },
        data: { is_delete: true },
      });

      await this.prisma.admins.updateMany({
        where: { id: userId },
        data: { is_delete: true },
      });

      return null;
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: `User with ID ${userId} not found.`,
      });

      throw error;
    }
  }
}
