import { PartialType } from '@nestjs/mapped-types';
import { CreateComplexDto } from './create-complex.dto.js';

export class UpdateComplexDto extends PartialType(CreateComplexDto) {}
