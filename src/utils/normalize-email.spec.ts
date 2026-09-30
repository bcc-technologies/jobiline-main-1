import { normalizeEmail } from './normalize-email';

describe('normalizeEmail', () => {
  it('should trim and lowercase an email address', () => {
    expect(normalizeEmail(' John.Doe@Example.COM ')).toBe(
      'john.doe@example.com',
    );
  });

  it('should return null for empty input', () => {
    expect(normalizeEmail('  ')).toBeNull();
  });
});
