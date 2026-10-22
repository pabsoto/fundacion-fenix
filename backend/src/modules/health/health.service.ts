import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HealthResponseDto } from './dto/health-response.dto.js';

@Injectable()
export class HealthService {
  private initialization: Promise<DataSource> | null = null;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async check(): Promise<HealthResponseDto> {
    try {
      await this.ensureDatabaseInitialized();
      await this.dataSource.query('SELECT 1');

      return {
        status: 'ok',
        database: 'up',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'error',
        database: 'down',
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async ensureDatabaseInitialized(): Promise<void> {
    if (this.dataSource.isInitialized) {
      return;
    }

    this.initialization ??= this.dataSource.initialize();

    try {
      await this.initialization;
    } catch (error) {
      this.initialization = null;
      throw error;
    }
  }
}
