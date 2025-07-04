import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { GetUser, Roles } from 'src/auth/decorator';
import { UsersService } from './users.service';
import { CreateUserDto, GetUsersDto, UpdateUserDto } from './dto';
import { Role } from '../auth/enums/role.enum';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Get()
  async getUsers(@Query() query: GetUsersDto) {
    return this.usersService.getUsers(query);
  }

  @Roles(Role.SUPERADMIN)
  @Post()
  async createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Roles(Role.CLIENT, Role.ADMIN, Role.SUPERADMIN)
  @Get(':id')
  async getUser(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: Role,
  ) {
    // Se verifica que el usuario está autorizado
    if (userRole === Role.CLIENT && userId !== id) {
      throw new ForbiddenException('You are not allowed to access this user.');
    }

    return this.usersService.getUser(id);
  }

  @Roles(Role.CLIENT, Role.ADMIN, Role.SUPERADMIN)
  @Put(':id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: Role,
    @Body(new ValidationPipe({ skipMissingProperties: true }))
    dto: UpdateUserDto,
  ) {
    // Se verifica que el usuario está autorizado
    if (userRole === Role.CLIENT && userId !== id) {
      throw new ForbiddenException('You are not allowed to access this user.');
    }

    return this.usersService.updateUser(id, dto);
  }

  @Roles(Role.CLIENT, Role.ADMIN, Role.SUPERADMIN)
  @Delete(':id')
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: Role,
  ) {
    // Se verifica que el usuario está autorizado
    if (userRole === Role.CLIENT && userId !== id) {
      throw new ForbiddenException('You are not allowed to access this user.');
    }

    return this.usersService.deleteUser(id);
  }
}
