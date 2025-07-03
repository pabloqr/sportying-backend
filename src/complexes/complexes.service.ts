import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateComplexDto,
  GetComplexesDto,
  UpdateComplexDto,
  UpdateComplexTimeDto,
} from './dto';
import { ResponseComplexDto, ResponseComplexTimeDto } from '../common/dto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorsService } from '../common/errors.service';

@Injectable()
export class ComplexesService {
  constructor(
    private prisma: PrismaService,
    private errorsService: ErrorsService,
  ) {}

  async getComplexes(
    dto: GetComplexesDto,
    checkDeleted: boolean = false,
  ): Promise<Array<ResponseComplexDto>> {
    // Se construye el objeto 'where' para establecer las condiciones de la consulta
    const where: Prisma.complexesWhereInput = {
      // Se evita obtener los usuarios eliminados
      ...(!checkDeleted && { is_delete: false }),

      ...(dto.id !== undefined && { id: dto.id }),

      // Se establecen las condiciones para los campos de tipo 'string'
      ...(dto.complexName !== undefined && {
        complex_name: { contains: dto.complexName, mode: 'insensitive' },
      }),

      // Se establecen las condiciones para los campos de tipo 'DateTime'
      ...(dto.timeIni !== undefined && { time_ini: dto.timeIni }),
      ...(dto.timeEnd !== undefined && { time_end: dto.timeEnd }),

      ...(dto.locLongitude !== undefined && {
        loc_longitude: dto.locLongitude,
      }),
      ...(dto.locLatitude !== undefined && { loc_latitude: dto.locLatitude }),
    };

    // Se realiza la consulta seleccionando las columnas que se quieren devolver
    const complexes = await this.prisma.complexes.findMany({
      where,
      select: {
        id: true,
        complex_name: true,
        time_ini: true,
        time_end: true,
        loc_longitude: true,
        loc_latitude: true,
        created_at: true,
        updated_at: true,
      },
    });

    // Se devuelve la lista modificando los elementos obtenidos
    return complexes.map((complex) => new ResponseComplexDto(complex));
  }

  async createComplex(dto: CreateComplexDto): Promise<ResponseComplexDto> {
    try {
      // Se crea la entrada para el usuario en la BD
      const complex = await this.prisma.complexes.create({
        data: {
          complex_name: dto.complexName,
          time_ini: dto.timeIni,
          time_end: dto.timeEnd,
          loc_longitude: dto.locLongitude,
          loc_latitude: dto.locLatitude,
        },
        select: {
          id: true,
          complex_name: true,
          time_ini: true,
          time_end: true,
          loc_longitude: true,
          loc_latitude: true,
          created_at: true,
          updated_at: true,
        },
      });

      return new ResponseComplexDto(complex);
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: 'Complex already exists.',
      });

      throw error;
    }
  }

  async getComplex(id: number): Promise<ResponseComplexDto> {
    // Se trata de obtener el usuario con el 'id' dado
    const result = await this.getComplexes({ id });

    // Se verifican los elementos obtenidos
    if (result.length === 0) {
      throw new NotFoundException(`Complex with ID ${id} not found.`);
    } else if (result.length > 1) {
      throw new InternalServerErrorException(
        `Multiple complexes found with ID ${id}.`,
      );
    }

    return result[0];
  }

  async updateComplex(
    id: number,
    dto: UpdateComplexDto,
  ): Promise<ResponseComplexDto> {
    // Se verifica que el cuerpo contiene elementos
    this.errorsService.noBodyError(dto);

    // Se establecen las propiedades a actualizar
    const data = {
      ...('complexName' in dto &&
        dto.complexName !== undefined && { complex_name: dto.complexName }),
      ...('timeIni' in dto &&
        dto.timeIni !== undefined && { time_ini: dto.timeIni }),
      ...('timeEnd' in dto &&
        dto.timeEnd !== undefined && { time_end: dto.timeEnd }),
      ...('locLongitude' in dto &&
        dto.locLongitude !== undefined && { loc_longitude: dto.locLongitude }),
      ...('locLatitude' in dto &&
        dto.locLatitude !== undefined && { loc_latitude: dto.locLatitude }),
    };

    try {
      // Se actualiza la entrada del complejo
      const complex = await this.prisma.complexes.update({
        where: {
          id: id,
          is_delete: false,
        },
        data,
      });

      return new ResponseComplexDto(complex);
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: `Complex with ID ${id} not found.`,
      });

      throw error;
    }
  }

  async deleteComplex(id: number): Promise<null> {
    try {
      await this.prisma.complexes.update({
        where: { id },
        data: { is_delete: true },
      });

      return null;
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: `Complex with ID ${id} not found.`,
      });

      throw error;
    }
  }

  async getComplexTime(id: number): Promise<ResponseComplexTimeDto> {
    const complex = await this.getComplex(id);
    return { timeIni: complex.timeIni, timeEnd: complex.timeEnd };
  }

  async setComplexTime(
    id: number,
    dto: UpdateComplexTimeDto,
  ): Promise<ResponseComplexTimeDto> {
    const complex = await this.updateComplex(id, dto);
    return { timeIni: complex.timeIni, timeEnd: complex.timeEnd };
  }
}
