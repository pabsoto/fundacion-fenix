import { Module } from '@nestjs/common';
import { ImpactoPublicoController } from './impacto-publico.controller.js';
import { ImpactoPublicoService } from './impacto-publico.service.js';

@Module({
  controllers: [ImpactoPublicoController],
  providers: [ImpactoPublicoService],
})
export class ImpactoPublicoModule {}
