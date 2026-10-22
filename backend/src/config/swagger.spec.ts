import { ConfigService } from '@nestjs/config';
import { isSwaggerEnabled } from './swagger.js';

function config(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as ConfigService;
}

describe('Swagger configuration', () => {
  it('is enabled by default during development', () => {
    expect(isSwaggerEnabled(config({ NODE_ENV: 'development' }))).toBe(true);
  });

  it('can be disabled explicitly outside production', () => {
    expect(
      isSwaggerEnabled(
        config({ NODE_ENV: 'development', SWAGGER_ENABLED: 'false' }),
      ),
    ).toBe(false);
  });

  it('is disabled by default in production', () => {
    expect(isSwaggerEnabled(config({ NODE_ENV: 'production' }))).toBe(false);
  });

  it('requires the exact explicit setting in production', () => {
    expect(
      isSwaggerEnabled(
        config({ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' }),
      ),
    ).toBe(true);
    expect(
      isSwaggerEnabled(
        config({ NODE_ENV: 'production', SWAGGER_ENABLED: 'TRUE' }),
      ),
    ).toBe(false);
  });
});
