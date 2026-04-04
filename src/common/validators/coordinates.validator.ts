import {
  registerDecorator,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class CoordinatesValidator implements ValidatorConstraintInterface {
  validate(value: any, validationArguments?: ValidationArguments): Promise<boolean> | boolean {
    const dto = validationArguments?.object as any;
    const { locLatitude, locLongitude } = dto;

    const isLatitudeDefined = locLatitude && locLatitude !== null;
    const isLongitudeDefined = locLongitude && locLongitude !== null;

    return (isLatitudeDefined && isLongitudeDefined) || (!isLatitudeDefined && !isLongitudeDefined);
  }

  defaultMessage(_validationArguments?: ValidationArguments): string {
    return 'Must provide both latitude and longitude';
  }
}

export function Coordinates(validationOptions?: any) {
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: CoordinatesValidator,
    });
  };
}
