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
import { Public, Roles } from 'src/auth/decorator';
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

  @Roles(Role.CLIENT, Role.ADMIN)
  @Get(':complexId')
  async getComplex(@Param('complexId', ParseIntPipe) complexId: number) {
    return this.complexesService.getComplex(complexId);
  }

  @Roles(Role.SUPERADMIN)
  @Post()
  async createComplex(@Body() dto: CreateComplexDto) {
    return this.complexesService.createComplex(dto);
  }

  @Roles(Role.ADMIN)
  @Put(':complexId')
  async updateComplex(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Body(new ValidationPipe({ skipMissingProperties: true }))
    dto: UpdateComplexDto,
  ) {
    return this.complexesService.updateComplex(complexId, dto);
  }

  @Roles(Role.SUPERADMIN)
  @Delete(':complexId')
  async deleteComplex(@Param('complexId', ParseIntPipe) complexId: number) {
    return this.complexesService.deleteComplex(complexId);
  }

  @Roles(Role.CLIENT, Role.ADMIN)
  @Get(':complexId/time')
  async getComplexTime(@Param('complexId', ParseIntPipe) complexId: number) {
    return this.complexesService.getComplexTime(complexId);
  }

  @Roles(Role.ADMIN)
  @Post(':complexId/time')
  async setComplexTime(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Body() dto: UpdateComplexTimeDto,
  ) {
    return this.complexesService.setComplexTime(complexId, dto);
  }

  @Public()
  @Get(':complexId/availability')
  async getComplexAvailability(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Query('groupAvailability') groupAvailability: boolean = true,
  ) {
    return this.complexesService.getComplexAvailability(
      complexId,
      groupAvailability,
    );
  }
}
