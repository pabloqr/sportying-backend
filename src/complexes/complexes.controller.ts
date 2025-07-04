import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { Roles } from 'src/auth/decorator';
import { ComplexesService } from './complexes.service';
import {
  CreateComplexDto,
  GetComplexesDto,
  UpdateComplexDto,
  UpdateComplexTimeDto,
} from './dto';
import { Role } from '../auth/enums/role.enum';

@Controller('complexes')
export class ComplexesController {
  constructor(private complexesService: ComplexesService) {}

  @Roles(Role.CLIENT, Role.ADMIN)
  @Get()
  async getComplexes(
    @Query(new ValidationPipe({ skipMissingProperties: true }))
    query: GetComplexesDto,
  ) {
    return this.complexesService.getComplexes(query);
  }

  @Roles(Role.SUPERADMIN)
  @Post()
  async createComplex(@Body() dto: CreateComplexDto) {
    return this.complexesService.createComplex(dto);
  }

  @Roles(Role.CLIENT, Role.ADMIN)
  @Get(':id')
  async getComplex(@Param('id', ParseIntPipe) id: number) {
    return this.complexesService.getComplex(id);
  }

  @Roles(Role.ADMIN)
  @Put(':id')
  async updateComplex(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ skipMissingProperties: true }))
    dto: UpdateComplexDto,
  ) {
    return this.complexesService.updateComplex(id, dto);
  }

  @Roles(Role.SUPERADMIN)
  @Delete(':id')
  async deleteComplex(@Param('id', ParseIntPipe) id: number) {
    return this.complexesService.deleteComplex(id);
  }

  @Roles(Role.CLIENT, Role.ADMIN)
  @Get(':id/time')
  async getComplexTime(@Param('id', ParseIntPipe) id: number) {
    return this.complexesService.getComplexTime(id);
  }

  @Roles(Role.ADMIN)
  @Post(':id/time')
  async setComplexTime(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComplexTimeDto,
  ) {
    return this.complexesService.setComplexTime(id, dto);
  }
}
