import { getMetadataStorage, validateSync } from 'class-validator';
import 'reflect-metadata';
import { Coordinates, CoordinatesValidator } from '../../../src/common/validators/coordinates.validator.js';

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('CoordinatesValidator', () => {
  let validator: CoordinatesValidator;

  beforeEach(() => {
    validator = new CoordinatesValidator();
  });

  it('returns true when both coordinates are provided', () => {
    expect(
      validator.validate(null, {
        object: { locLatitude: 40.4, locLongitude: -3.7 },
      } as any),
    ).toBe(true);
  });

  it('returns true when both coordinates are omitted', () => {
    expect(
      validator.validate(null, {
        object: { locLatitude: undefined, locLongitude: undefined },
      } as any),
    ).toBe(true);
  });

  it('returns false when only one coordinate is provided', () => {
    expect(
      validator.validate(null, {
        object: { locLatitude: 40.4, locLongitude: undefined },
      } as any),
    ).toBe(false);
  });

  it('returns the default validation message', () => {
    expect(validator.defaultMessage()).toBe('Must provide both latitude and longitude');
  });

  it('registers the custom decorator on the target property', () => {
    class TestDto {
      locLatitude?: number;
      locLongitude?: number;

      @Coordinates()
      location?: string;
    }

    const errors = validateSync(Object.assign(new TestDto(), { locLatitude: 40.4 }));
    expect(errors).toHaveLength(1);
    expect(errors).toEqual([expect.objectContaining({ property: 'location' })]);
    expect(getMetadataStorage().getTargetValidationMetadatas(TestDto, '', false, false)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          propertyName: 'location',
        }),
      ]),
    );
  });
});
