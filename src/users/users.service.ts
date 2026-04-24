import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import * as argon from 'argon2';
import { Prisma, user_role } from '../../prisma/generated/client.js';
import { Role } from '../auth/enums/index.js';
import { ResponseUserDto } from '../common/dto/index.js';
import { ErrorsService } from '../common/errors.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto, GetUsersDto, UpdateUserDto, USER_ORDER_FIELD_MAP } from './dto/index.js';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private errorsService: ErrorsService,
  ) {}

  /**
   * Retrieves a list of users based on the provided filters and ordering specifications.
   *
   * @param {GetUsersDto} dto - The data transfer object containing filters and sorting parameters for the query.
   * @param {boolean} [checkDeleted=false] - Whether to include users marked as deleted in the results. Defaults to
   * `false`.
   * @return {Promise<Array<ResponseUserDto>>} - A promise that resolves to an array of user data formatted as
   * `ResponseUserDto`.
   */
  async getUsers(dto: GetUsersDto, checkDeleted: boolean = false): Promise<Array<ResponseUserDto>> {
    // Construir el objeto 'where' para establecer las condiciones de la consulta
    const where: Prisma.usersWhereInput = {
      // Evitar obtener los usuarios eliminados
      ...(!checkDeleted && { is_delete: false }),

      ...(dto.id && { id: dto.id }),

      // Establecer la condición para obtener el rol
      ...(dto.role && {
        AND: [
          { role: dto.role as user_role },
          {
            admins: (dto.role as Role) === Role.ADMIN ? { some: { is_delete: false } } : { none: { is_delete: false } },
          },
        ],
      }),

      // Establecer las condiciones para los campos de tipo 'string'
      ...(dto.name && { name: { contains: dto.name, mode: 'insensitive' } }),
      ...(dto.surname && { surname: { contains: dto.surname, mode: 'insensitive' } }),

      ...(dto.mail && { mail: dto.mail }),
      ...(dto.phonePrefix && { phone_prefix: dto.phonePrefix }),
      ...(dto.phoneNumber && { phone_number: dto.phoneNumber }),
    };

    // Obtener el modo de ordenación de los elementos
    const orderBy: Prisma.usersOrderByWithRelationInput[] = [];
    if (dto.orderParams) {
      dto.orderParams.forEach((orderParam) => {
        const field = USER_ORDER_FIELD_MAP[orderParam.field];
        orderBy.push({
          [field]: orderParam.order,
        });
      });
    }

    // Realizar la consulta especificando las columnas para evitar devolver las credenciales privadas
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
      orderBy,
    });

    // Formatear el campo para el rol de usuario
    return users.map((user) => ({
      ...user,
      role: user.role as Role,
    }));
  }

  /**
   * Retrieves a user with the specified ID.
   *
   * @param {number} userId - The unique identifier of the user to retrieve.
   * @return {Promise<ResponseUserDto>} Returns a promise that resolves to the user data if found.
   * @throws {NotFoundException} If no user is found with the specified ID.
   * @throws {InternalServerErrorException} If multiple users are found with the specified ID.
   */
  async getUserById(userId: number): Promise<ResponseUserDto> {
    // Tratar de obtener el usuario con el 'id' dado
    const result = await this.getUsers({ id: userId });

    // Verificar los elementos obtenidos
    if (result.length > 1) {
      throw new InternalServerErrorException(`Multiple users found with ID ${userId}.`);
    }

    // Obtener el usuario
    const user = result[0];

    // Verificar que es un objeto válido
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    return user;
  }

  /**
   * Retrieves a user based on the provided email address.
   *
   * @param {string} userMail - The email address of the user to retrieve.
   * @return {Promise<ResponseUserDto>} A promise that resolves to an object representing the user.
   * @throws {NotFoundException} If no user is found with the provided email.
   * @throws {InternalServerErrorException} If multiple users are found with the provided email.
   */
  async getUserByMail(userMail: string): Promise<ResponseUserDto> {
    // Tratar de obtener el usuario con el 'mail' dado
    const result = await this.getUsers({ mail: userMail });

    // Verificar los elementos obtenidos
    if (result.length > 1) {
      throw new InternalServerErrorException(`Multiple users found with mail ${userMail}.`);
    }

    // Obtener el usuario
    const user = result[0];

    // Verificar que es un objeto válido
    if (!user) {
      throw new NotFoundException(`User with mail ${userMail} not found.`);
    }

    return user;
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
    // En caso de no proporcionar una contraseña, establecer una por defecto
    if (!dto.password) {
      dto.password = '1234';
    }

    // Verificar si es administrador para realizar algunas comprobaciones previas
    if (dto.role === Role.ADMIN) {
      if (!dto.complexId) {
        throw new BadRequestException('Complex ID not included in request.');
      }

      try {
        await this.prisma.complexes.findUniqueOrThrow({ where: { id: dto.complexId } });
      } catch (error) {
        this.errorsService.dbError(error, {
          p2025: `Complex with ID ${dto.complexId} not found.`,
        });

        throw error;
      }
    }

    // Verificar si hay un usuario con los datos proporcionados almacenado en la BD
    const users = await this.getUsers({ mail: dto.mail }, true);
    const existingUser = users[0];

    if (existingUser) {
      // Si el usuario se encuentra en la BD, actualizar su estado para habilitarlo
      try {
        const user = await this.prisma.users.update({
          where: {
            id: existingUser.id,
          },
          data: {
            is_delete: false,
            password: await argon.hash(dto.password),
            name: dto.name,
            surname: dto.surname,
            phone_prefix: dto.phonePrefix,
            phone_number: dto.phoneNumber,
            updated_at: new Date(),
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

        const role = user.role as Role;
        if (role !== dto.role) {
          await this.updateUser(user.id, { role: dto.role });
        }

        return {
          ...user,
          role: user.role as Role,
        };
      } catch (error) {
        this.errorsService.dbError(error, {
          p2002: 'Credentials already exist. Please try again with different credentials.',
        });

        throw error;
      }
    } else {
      // Si no se encuentra en la BD, tratar de almacenarlo
      try {
        // Crear la entrada para el usuario en la BD
        const user = await this.prisma.users.create({
          data: {
            role: dto.role as user_role,
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

        // Obtener el rol del usuario
        const role = user.role as Role;

        // Verificar si el usuario que crear es un administrador
        if (role === Role.ADMIN) {
          // Crear la entrada para el administrador en la BD
          await this.prisma.admins.create({
            data: {
              id: user.id,
              complex_id: dto.complexId!,
            },
          });
        }

        // Devolver el objeto creado formateando el campo para el rol de usuario
        return {
          ...user,
          role,
        };
      } catch (error) {
        this.errorsService.dbError(error, {
          p2002: 'Credentials already exist. Please try again with different credentials.',
        });

        throw error;
      }
    }
  }

  /**
   * Updates a user's information based on the provided data transfer object (DTO).
   * This method handles updating user properties, including password, name,
   * surname, mail, phone details, and role. It also manages the user's admin state.
   *
   * @param {number} userId - The unique identifier of the user to update.
   * @param {UpdateUserDto} dto - An object containing the updated information for the user.
   * @return {Promise<ResponseUserDto>} A promise resolving to the updated user's information.
   */
  async updateUser(userId: number, dto: UpdateUserDto): Promise<ResponseUserDto> {
    this.errorsService.noBodyError(dto);

    // Establecer las propiedades a actualizar
    const data = {
      ...(dto.role && { role: dto.role as user_role }),
      ...(dto.password && {
        password: await argon.hash(dto.password),
      }),
      ...(dto.name && { name: dto.name }),
      ...(dto.surname && { surname: dto.surname }),
      ...(dto.mail && { mail: dto.mail }),
      ...(dto.phonePrefix && { phone_prefix: dto.phonePrefix }),
      ...(dto.phoneNumber && { phone_number: dto.phoneNumber }),
    };

    try {
      // Actualizar la entrada del usuario
      const user = await this.prisma.users.update({
        where: {
          id: userId,
          is_delete: false,
        },
        data: { ...data, updated_at: new Date() },
      });

      // Verificar el rol del usuario
      if (dto.role) {
        // Tratar de obtener la entrada en la tabla de administradores para el usuario actual
        const isAdmin = await this.prisma.admins.findUnique({
          where: {
            id_complex_id: {
              id: user.id,
              complex_id: 1,
            },
          },
        });

        if (dto.role === Role.ADMIN) {
          // Si el rol nuevo es de administrador y no está almacenado, crear la entrada en la tabla de administradores
          if (isAdmin === null) {
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
                updated_at: new Date(),
              },
            });
          }
        } else if (isAdmin !== null) {
          // Si el rol nuevo es de usuario y está almacenado, eliminar la entrada de la tabla de administradores
          await this.prisma.admins.update({
            where: {
              id_complex_id: {
                id: user.id,
                complex_id: 1,
              },
            },
            data: {
              is_delete: true,
              updated_at: new Date(),
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
        p2002: 'Credentials already exist. Please try again with different credentials.',
        p2025: `User with ID ${userId} not found.`,
      });

      throw error;
    }
  }

  /**
   * Marks a user and their associated admin data as deleted in the database.
   *
   * @param {number} userId - The unique identifier of the user to be deleted.
   * @return {Promise<null>} Returns a promise that resolves to null after the user and admins are marked as deleted.
   */
  async deleteUser(userId: number): Promise<null> {
    try {
      await this.prisma.users.update({
        where: { id: userId },
        data: { is_delete: true, updated_at: new Date() },
      });

      await this.prisma.admins.updateMany({
        where: { id: userId },
        data: { is_delete: true, updated_at: new Date() },
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


