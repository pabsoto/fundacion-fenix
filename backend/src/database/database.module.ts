import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createNestTypeOrmOptions } from './database-options.js';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => createNestTypeOrmOptions(process.env),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
