export class HealthResponseDto {
  status: 'ok' | 'error';
  database: 'up' | 'down';
  timestamp: string;
}
