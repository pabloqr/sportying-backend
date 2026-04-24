import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ResponseSportDto } from '../common/dto/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../prisma/generated/client.js';
import { GetSportsDto, SPORT_ORDER_FIELD_MAP } from './dto/index.js';

@Injectable()
export class SportsService {
  constructor(private prisma: PrismaService) {}

  async getComplexSports(complexId: number, dto: GetSportsDto): Promise<Array<ResponseSportDto>> {
    // Construir el objeto 'where' para establecer las condiciones de la consulta
    const where: Prisma.sportsWhereInput = {
      ...(dto.minPeople && { min_people: dto.minPeople }),
      ...(dto.maxPeople && { max_people: dto.maxPeople }),
    };

    // Obtener las claves proporcionadas
    const keys = dto.keys;

    // Obtener las pistas asociadas al complejo actual
    const courts = await this.prisma.courts.findMany({ where: { complex_id: complexId } });
    // Obtener los deportes (construcción del Set) y convertir la colección en un Array
    const sportKeys = [...new Set(courts.map((court) => court.sport_key))];
    // Si se proporciona el listado de claves de deportes, filtrar la lista obtenida
    const filteredSportKeys = keys ? sportKeys.filter((key) => keys.includes(key)) : sportKeys;

    // Obtener los datos de los deportes obtenidos incluyendo los parámetros de filtrado
    const sports = await this.prisma.sports.findMany({
      where: {
        key: { in: filteredSportKeys },
        ...where,
        is_delete: false,
      },
    });

    return sports.map((sport) => new ResponseSportDto(sport));
  }

  async getSports(dto: GetSportsDto, checkDeleted: boolean = false): Promise<Array<ResponseSportDto>> {
    // Construir el objeto 'where' para establecer las condiciones de la consulta
    const where: Prisma.sportsWhereInput = {
      // Evitar obtener los deportes eliminados
      ...(!checkDeleted && { is_delete: false }),

      ...(dto.minPeople && { min_people: dto.minPeople }),
      ...(dto.maxPeople && { max_people: dto.maxPeople }),
    };

    // Obtener las claves proporcionadas
    const keys = dto.keys;

    // Obtener el modo de ordenación de los elementos
    const orderBy: Prisma.sportsOrderByWithRelationInput[] = [];
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
    const filteredSports = keys ? sports.filter((sport) => keys.includes(sport.key)) : sports;

    return filteredSports.map((sport) => new ResponseSportDto(sport));
  }

  async getSport(sportKey: string): Promise<ResponseSportDto> {
    // Tratar de obtener el complejo con el 'id' dado
    const result = await this.getSports({ keys: [sportKey] });

    // Verificar los elementos obtenidos
    if (result.length > 1) {
      throw new InternalServerErrorException(`Multiple sports found with Key ${sportKey}.`);
    }

    // Obtener el usuario
    const sport = result[0];

    // Verificar que es un objeto válido
    if (!sport) {
      throw new NotFoundException(`Sport with Key ${sportKey} not found.`);
    }

    return sport;
  }
}


