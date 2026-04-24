import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { OrderBy } from '../../../src/common/enums/index.js';
import { COURT_ORDER_FIELD_MAP, CourtOrderField, GetCourtsDto } from '../../../src/courts/dto/get-courts.dto.js';
import { CourtStatus } from '../../../src/courts/enums/index.js';

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('GetCourtsDto', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('parses statusData from a JSON string into the nested dto', () => {
    const dto = plainToInstance(GetCourtsDto, {
      statusData: JSON.stringify({
        status: CourtStatus.WEATHER,
        alertLevel: 2,
        estimatedDryingTime: 45,
      }),
    });

    expect(dto.statusData).toEqual({
      status: CourtStatus.WEATHER,
      alertLevel: 2,
      estimatedDryingTime: 45,
    });
  });

  it('keeps statusData unchanged when the input is empty', () => {
    const dto = plainToInstance(GetCourtsDto, {
      statusData: undefined,
    });

    expect(dto.statusData).toBeUndefined();
  });

  it('returns the original statusData value when parsing fails', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const dto = plainToInstance(GetCourtsDto, {
      statusData: '{invalid-json',
    });

    expect(dto.statusData).toBe('{invalid-json');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('parses orderParams from a JSON string and defaults missing order values to ASC', () => {
    const dto = plainToInstance(GetCourtsDto, {
      orderParams: JSON.stringify([
        { field: CourtOrderField.NUMBER, order: OrderBy.DESC },
        { field: CourtOrderField.STATUS },
      ]),
    });

    expect(dto.orderParams).toEqual([
      { field: CourtOrderField.NUMBER, order: OrderBy.DESC },
      { field: CourtOrderField.STATUS, order: OrderBy.ASC },
    ]);
  });

  it('keeps array orderParams unchanged when they are already parsed', () => {
    const orderParams = [{ field: CourtOrderField.ID, order: OrderBy.ASC }];

    const dto = plainToInstance(GetCourtsDto, { orderParams });

    expect(dto.orderParams).toEqual(orderParams);
  });

  it('returns the original orderParams value when parsing fails', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const dto = plainToInstance(GetCourtsDto, {
      orderParams: '{invalid-json',
    });

    expect(dto.orderParams).toBe('{invalid-json');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('validates numeric and enum fields after transformation', () => {
    const dto = plainToInstance(GetCourtsDto, {
      id: '7',
      maxPeople: '4',
      orderParams: JSON.stringify([{ field: CourtOrderField.CREATED_AT }]),
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.id).toBe(7);
    expect(dto.maxPeople).toBe(4);
  });

  it('exports the expected prisma field mapping', () => {
    expect(COURT_ORDER_FIELD_MAP).toEqual({
      id: 'id',
      sportKey: 'sport_key',
      number: 'number',
      maxPeople: 'max_people',
      status: 'status',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    });
  });
});
