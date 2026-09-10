import 'reflect-metadata';
import authConfig from './auth.config';

const STRONG_SECRETS = {
  AUTH_JWT_SECRET: 'a-strong-jwt-secret',
  AUTH_REFRESH_SECRET: 'a-strong-refresh-secret',
  AUTH_FORGOT_SECRET: 'a-strong-forgot-secret',
  AUTH_CONFIRM_EMAIL_SECRET: 'a-strong-confirm-secret',
} as const;

const PLACEHOLDER_SECRETS = {
  AUTH_JWT_SECRET: 'secret',
  AUTH_REFRESH_SECRET: 'secret_for_refresh',
  AUTH_FORGOT_SECRET: 'secret_for_forgot',
  AUTH_CONFIRM_EMAIL_SECRET: 'secret_for_confirm_email',
} as const;

const TOKEN_TTL = {
  AUTH_JWT_TOKEN_EXPIRES_IN: '15m',
  AUTH_REFRESH_TOKEN_EXPIRES_IN: '30d',
  AUTH_FORGOT_TOKEN_EXPIRES_IN: '30m',
  AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN: '1d',
} as const;

describe('auth.config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function applyEnv(values: Record<string, string>): void {
    Object.assign(process.env, TOKEN_TTL, values);
  }

  it('should throw in production when placeholder secrets are still configured', () => {
    process.env.NODE_ENV = 'production';
    applyEnv(PLACEHOLDER_SECRETS);

    expect(() => authConfig()).toThrow(/placeholder values from env-example/);
  });

  it('should load in development when placeholder secrets are still configured', () => {
    process.env.NODE_ENV = 'development';
    applyEnv(PLACEHOLDER_SECRETS);

    expect(authConfig()).toMatchObject({
      secret: 'secret',
      refreshSecret: 'secret_for_refresh',
    });
  });

  it('should load strong secrets in production', () => {
    process.env.NODE_ENV = 'production';
    applyEnv(STRONG_SECRETS);

    expect(authConfig()).toMatchObject({
      secret: STRONG_SECRETS.AUTH_JWT_SECRET,
      refreshSecret: STRONG_SECRETS.AUTH_REFRESH_SECRET,
    });
  });
});
