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
import { Public } from 'src/auth/decorator';
import { ComplexesService } from './complexes.service';
import {
  CreateComplexDto,
  GetComplexesDto,
  UpdateComplexDto,
  UpdateComplexTimeDto,
} from './dto';

@Controller('complexes')
export class ComplexesController {
  constructor(private complexesService: ComplexesService) {}

  @Public()
  @Get()
  async getComplexes(
    @Query(new ValidationPipe({ skipMissingProperties: true }))
    query: GetComplexesDto,
  ) {
    return this.complexesService.getComplexes(query);
  }

  @Public()
  @Post()
  async createComplex(@Body() dto: CreateComplexDto) {
    return this.complexesService.createComplex(dto);
  }

  @Public()
  @Get(':id')
  async getComplex(@Param('id', ParseIntPipe) id: number) {
    return this.complexesService.getComplex(id);
  }

  @Public()
  @Put(':id')
  async updateComplex(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ skipMissingProperties: true }))
    dto: UpdateComplexDto,
  ) {
    return this.complexesService.updateComplex(id, dto);
  }

  @Public()
  @Delete(':id')
  async deleteComplex(@Param('id', ParseIntPipe) id: number) {
    return this.complexesService.deleteComplex(id);
  }

  @Public()
  @Get(':id/time')
  async getComplexTime(@Param('id', ParseIntPipe) id: number) {
    return this.complexesService.getComplexTime(id);
  }

  @Public()
  @Post(':id/time')
  async setComplexTime(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComplexTimeDto,
  ) {
    return this.complexesService.setComplexTime(id, dto);
  }
}
