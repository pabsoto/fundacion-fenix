import { DataSource } from 'typeorm';
import { vi } from 'vitest';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  it('retries initialization and recovers after PostgreSQL becomes available', async () => {
    let initialized = false;
    const initialize = vi
      .fn()
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockImplementationOnce(async () => {
        initialized = true;
        return dataSource;
      });
    const query = vi.fn().mockResolvedValue([{ '?column?': 1 }]);
    const dataSource = {
      get isInitialized() {
        return initialized;
      },
      initialize,
      query,
    } as unknown as DataSource;
    const service = new HealthService(dataSource);

    await expect(service.check()).resolves.toMatchObject({
      status: 'error',
      database: 'down',
    });
    await expect(service.check()).resolves.toMatchObject({
      status: 'ok',
      database: 'up',
    });

    expect(initialize).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenCalledOnce();
  });
});
