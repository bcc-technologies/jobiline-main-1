import 'reflect-metadata';
import { IsInt, IsString, Max, Min } from 'class-validator';
import validateConfig from './validate-config';

class SampleEnv {
  @IsString()
  NAME: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number;
}

describe('validateConfig', () => {
  it('should return converted values when the environment is valid', () => {
    const result = validateConfig({ NAME: 'api', PORT: '3001' }, SampleEnv);

    expect(result).toMatchObject({
      NAME: 'api',
      PORT: 3001,
    });
  });

  it('should throw when a required value is missing or invalid', () => {
    expect(() =>
      validateConfig({ NAME: 'api', PORT: 'nope' }, SampleEnv),
    ).toThrow(/PORT/);
  });
});
