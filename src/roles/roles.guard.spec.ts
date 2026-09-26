import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  it('should allow a user when any assigned role matches', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([3]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      getClass: jest.fn(),
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: { id: 2 }, roles: [{ id: 3 }] },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject a user without a matching role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([3]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      getClass: jest.fn(),
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: { id: 2 }, roles: [{ id: 4 }] },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(false);
  });
});
