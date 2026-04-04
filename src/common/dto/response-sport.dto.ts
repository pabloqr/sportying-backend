import { IsDate, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class ResponseSportDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsInt()
  @IsNotEmpty()
  minPeople: number;

  @IsInt()
  @IsNotEmpty()
  maxPeople: number;

  @IsDate()
  @IsNotEmpty()
  createdAt: Date;

  @IsDate()
  @IsNotEmpty()
  updatedAt: Date;

  constructor(complex: any) {
    this.key = complex.key;
    this.minPeople = complex.min_people ?? complex.minPeople;
    this.maxPeople = complex.max_people ?? complex.maxPeople;
    this.createdAt = new Date(complex.created_at ?? complex.createdAt);
    this.updatedAt = new Date(complex.updated_at ?? complex.updatedAt);
  }
}
