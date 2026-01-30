import { Module, forwardRef } from '@nestjs/common';
import { ComplexesModule } from 'src/complexes/complexes.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [forwardRef(() => ComplexesModule)],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule { }
