import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionEntity } from '../entities/session.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';

import { SessionRepository } from '../../session.repository';
import { Session } from '../../../../domain/session';

import { SessionMapper } from '../mappers/session.mapper';
import { User } from '../../../../../users/domain/user';

@Injectable()
export class SessionRelationalRepository implements SessionRepository {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
  ) {}

  async findById(id: Session['id']): Promise<NullableType<Session>> {
    const entity = await this.sessionRepository.findOne({
      where: {
        id: Number(id),
      },
    });

    return entity ? SessionMapper.toDomain(entity) : null;
  }

  async create(data: Session): Promise<Session> {
    const persistenceModel = SessionMapper.toPersistence(data);
    return this.sessionRepository.save(
      this.sessionRepository.create(persistenceModel),
    );
  }

  async update(
    id: Session['id'],
    payload: Partial<
      Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
    >,
  ): Promise<Session | null> {
    const entity = await this.sessionRepository.findOne({
      where: { id: Number(id) },
    });

    if (!entity) {
      throw new Error('Session not found');
    }

    const updatedEntity = await this.sessionRepository.save(
      this.sessionRepository.create(
        SessionMapper.toPersistence({
          ...SessionMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return SessionMapper.toDomain(updatedEntity);
  }

  async updateByHash(
    conditions: { id: Session['id']; hash: Session['hash'] },
    payload: Partial<
      Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
    >,
  ): Promise<Session | null> {
    const entity = await this.sessionRepository.findOne({
      where: { id: Number(conditions.id) },
    });

    if (!entity || entity.revokedAt || entity.expiresAt <= new Date()) {
      return null;
    }

    if (entity.hash !== conditions.hash) {
      await this.revokeByFamilyId(entity.tokenFamilyId, 'refresh_reuse');
      return null;
    }

    const result = await this.sessionRepository.update(
      { id: Number(conditions.id), hash: conditions.hash },
      {
        hash: payload.hash,
        lastUsedAt: payload.lastUsedAt,
      },
    );

    if (!result.affected) {
      return null;
    }

    const updatedEntity = await this.sessionRepository.findOne({
      where: { id: Number(conditions.id) },
    });

    return updatedEntity ? SessionMapper.toDomain(updatedEntity) : null;
  }

  async deleteById(id: Session['id']): Promise<void> {
    await this.sessionRepository.update(
      { id: Number(id) },
      { revokedAt: new Date(), revocationReason: 'logout' },
    );
  }

  async deleteByUserId(conditions: { userId: User['id'] }): Promise<void> {
    await this.sessionRepository
      .createQueryBuilder()
      .update(SessionEntity)
      .set({ revokedAt: new Date(), revocationReason: 'password_changed' })
      .where('"userId" = :userId', { userId: Number(conditions.userId) })
      .execute();
  }

  async deleteByUserIdWithExclude(conditions: {
    userId: User['id'];
    excludeSessionId: Session['id'];
  }): Promise<void> {
    await this.sessionRepository
      .createQueryBuilder()
      .update(SessionEntity)
      .set({ revokedAt: new Date(), revocationReason: 'password_changed' })
      .where('"userId" = :userId', { userId: Number(conditions.userId) })
      .andWhere('"id" != :id', { id: Number(conditions.excludeSessionId) })
      .execute();
  }

  async revokeByFamilyId(familyId: string, reason: string): Promise<void> {
    await this.sessionRepository.update(
      { tokenFamilyId: familyId },
      { revokedAt: new Date(), revocationReason: reason },
    );
  }
}
