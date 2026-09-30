import { IsNull, Repository } from 'typeorm';
import { SessionEntity } from '../entities/session.entity';
import { SessionRelationalRepository } from './session.repository';

describe('SessionRelationalRepository', () => {
  const activeSession = (overrides: Partial<SessionEntity> = {}) =>
    ({
      id: 12,
      hash: 'current-hash',
      tokenFamilyId: 'family-id',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      ...overrides,
    }) as SessionEntity;

  it('should rotate a valid refresh hash atomically', async () => {
    const session = activeSession();
    const updated = activeSession({ hash: 'next-hash' });
    const repository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(updated),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    } as unknown as Repository<SessionEntity>;
    const service = new SessionRelationalRepository(repository);

    const result = await service.updateByHash(
      { id: session.id, hash: session.hash },
      { hash: 'next-hash', lastUsedAt: new Date() },
    );

    expect(result?.hash).toBe('next-hash');
    expect(repository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: session.id,
        hash: session.hash,
        revokedAt: IsNull(),
        expiresAt: expect.any(Object),
      }),
      expect.objectContaining({ hash: 'next-hash' }),
    );
    expect(repository.findOne).toHaveBeenCalledTimes(2);
  });

  it('should revoke only the replayed token family when an old hash is reused', async () => {
    const session = activeSession({ hash: 'latest-hash' });
    const otherFamily = activeSession({
      id: 13,
      hash: 'other-hash',
      tokenFamilyId: 'other-family',
    });
    const repository = {
      findOne: jest.fn().mockResolvedValue(session),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    } as unknown as Repository<SessionEntity>;
    const service = new SessionRelationalRepository(repository);

    const result = await service.updateByHash(
      { id: session.id, hash: 'previous-hash' },
      { hash: 'attacker-hash', lastUsedAt: new Date() },
    );

    expect(result).toBeNull();
    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(repository.update).toHaveBeenCalledWith(
      { tokenFamilyId: 'family-id', revokedAt: IsNull() },
      expect.objectContaining({
        revokedAt: expect.any(Date),
        revocationReason: 'REFRESH_TOKEN_REUSE',
      }),
    );
    expect(otherFamily.tokenFamilyId).not.toBe('family-id');
  });

  it('should not treat a failed rotation as replay when the persisted hash did not change', async () => {
    const session = activeSession();
    const repository = {
      findOne: jest.fn().mockResolvedValue(session),
      update: jest.fn().mockResolvedValue({ affected: 0 }),
    } as unknown as Repository<SessionEntity>;
    const service = new SessionRelationalRepository(repository);

    const result = await service.updateByHash(
      { id: session.id, hash: session.hash },
      { hash: 'next-hash', lastUsedAt: new Date() },
    );

    expect(result).toBeNull();
    expect(repository.findOne).toHaveBeenCalledTimes(2);
    expect(repository.update).toHaveBeenCalledTimes(1);
  });

  it('should revoke the family when a concurrent refresh loses to a completed rotation', async () => {
    const initialSession = activeSession();
    const rotatedSession = activeSession({ hash: 'winner-hash' });
    const repository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(initialSession)
        .mockResolvedValueOnce(rotatedSession),
      update: jest
        .fn()
        .mockResolvedValueOnce({ affected: 0 })
        .mockResolvedValueOnce({ affected: 1 }),
    } as unknown as Repository<SessionEntity>;
    const service = new SessionRelationalRepository(repository);

    const result = await service.updateByHash(
      { id: initialSession.id, hash: initialSession.hash },
      { hash: 'loser-hash', lastUsedAt: new Date() },
    );

    expect(result).toBeNull();
    expect(repository.update).toHaveBeenNthCalledWith(
      2,
      { tokenFamilyId: 'family-id', revokedAt: IsNull() },
      expect.objectContaining({
        revokedAt: expect.any(Date),
        revocationReason: 'REFRESH_TOKEN_REUSE',
      }),
    );
  });
});
