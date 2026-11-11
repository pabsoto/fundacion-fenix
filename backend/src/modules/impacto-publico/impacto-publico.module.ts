import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { ImpactoPublicoController } from './impacto-publico.controller.js';
import { ImpactoPublicoService } from './impacto-publico.service.js';

@Module({
  imports: [StorageModule],
  controllers: [ImpactoPublicoController],
  providers: [ImpactoPublicoService],
})
export class ImpactoPublicoModule {}
