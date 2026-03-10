import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ResponseSportDto } from 'src/common/dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '../../prisma/generated/client';
import { GetSportsDto, SPORT_ORDER_FIELD_MAP } from './dto';

@Injectable()
export class SportsService {
  constructor(
    private prisma: PrismaService,
  ) { }

  async getSports(
    dto: GetSportsDto,
    checkDeleted: boolean = false,
  ): Promise<Array<ResponseSportDto>> {
    // Construir el objeto 'where' para establecer las condiciones de la consulta
    const where: Prisma.sportsWhereInput = {
      // Evitar obtener los deportes eliminados
      ...(!checkDeleted && { is_delete: false }),

      ...(dto.minPeople && { min_people: dto.minPeople }),
      ...(dto.maxPeople && { max_people: dto.maxPeople }),
    };

    // Obtener el modo de ordenación de los elementos
    let orderBy: Prisma.sportsOrderByWithRelationInput[] = [];
    if (dto.orderParams) {
      dto.orderParams.forEach((orderParam) => {
        const field = SPORT_ORDER_FIELD_MAP[orderParam.field];
        orderBy.push({
          [field]: orderParam.order,
        });
      });
    }

    // Realizar la consulta seleccionando las columnas que se quieren devolver
    const sports = await this.prisma.sports.findMany({
      where,
      select: {
        key: true,
        min_people: true,
        max_people: true,
        created_at: true,
        updated_at: true,
      },
      orderBy,
    });

    // Si se proporciona el listado de claves de deportes, filtrar la lista obtenida
    const filteredSports = dto.keys ? sports.filter((sport) => dto.keys.includes(sport.key)) : sports;

    return filteredSports.map((sport) => new ResponseSportDto(sport));
  }

  async getSport(sportKey: string): Promise<ResponseSportDto> {
    // Tratar de obtener el complejo con el 'id' dado
    const result = await this.getSports({ keys: [sportKey] });

    // Verificar los elementos obtenidos
    if (result.length === 0) {
      throw new NotFoundException(`Sport with Key ${sportKey} not found.`);
    } else if (result.length > 1) {
      throw new InternalServerErrorException(
        `Multiple sports found with Key ${sportKey}.`,
      );
    }

    return result[0];
  }
}
