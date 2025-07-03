import {
  registerDecorator,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class CoordinatesValidator implements ValidatorConstraintInterface {
  validate(
    value: any,
    validationArguments?: ValidationArguments,
  ): Promise<boolean> | boolean {
    const dto = validationArguments?.object as any;
    const { locLongitude, locLatitude } = dto;

    const isLongitudeDefined =
      locLongitude !== undefined && locLongitude !== null;
    const isLatitudeDefined = locLatitude !== undefined && locLatitude !== null;

    return (
      (isLongitudeDefined && isLatitudeDefined) ||
      (!isLongitudeDefined && !isLatitudeDefined)
    );
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return 'Must provide both longitude and latitude';
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
