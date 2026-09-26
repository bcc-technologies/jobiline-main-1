import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';
import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';
import { Session } from '../../../../domain/session';
import { SessionEntity } from '../entities/session.entity';

export class SessionMapper {
  static toDomain(raw: SessionEntity): Session {
    const domainEntity = new Session();
    domainEntity.id = raw.id;
    if (raw.user) {
      domainEntity.user = UserMapper.toDomain(raw.user);
    }
    domainEntity.hash = raw.hash;
    domainEntity.tokenFamilyId = raw.tokenFamilyId;
    domainEntity.expiresAt = raw.expiresAt;
    domainEntity.lastUsedAt = raw.lastUsedAt;
    domainEntity.revokedAt = raw.revokedAt;
    domainEntity.revocationReason = raw.revocationReason;
    domainEntity.userAgent = raw.userAgent;
    domainEntity.ipAddress = raw.ipAddress;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    domainEntity.deletedAt = raw.deletedAt;
    return domainEntity;
  }

  static toPersistence(domainEntity: Session): SessionEntity {
    const user = new UserEntity();
    user.id = Number(domainEntity.user.id);

    const persistenceEntity = new SessionEntity();
    if (domainEntity.id && typeof domainEntity.id === 'number') {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.hash = domainEntity.hash;
    persistenceEntity.tokenFamilyId = domainEntity.tokenFamilyId;
    persistenceEntity.expiresAt = domainEntity.expiresAt;
    persistenceEntity.lastUsedAt = domainEntity.lastUsedAt;
    persistenceEntity.revokedAt = domainEntity.revokedAt;
    persistenceEntity.revocationReason = domainEntity.revocationReason;
    persistenceEntity.userAgent = domainEntity.userAgent;
    persistenceEntity.ipAddress = domainEntity.ipAddress;
    persistenceEntity.user = user;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;
    persistenceEntity.deletedAt = domainEntity.deletedAt;

    return persistenceEntity;
  }
}
