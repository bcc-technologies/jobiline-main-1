import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'session',
})
export class SessionEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, {
    eager: true,
  })
  @Index()
  user: UserEntity;

  @Column({ name: 'refresh_token_hash' })
  hash: string;

  @Column({ type: 'uuid', name: 'token_family_id' })
  tokenFamilyId: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', name: 'last_used_at', nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'timestamp', name: 'revoked_at', nullable: true })
  revokedAt: Date | null;

  @Column({ type: String, name: 'revocation_reason', nullable: true })
  revocationReason: string | null;

  @Column({ type: String, name: 'user_agent', nullable: true })
  userAgent: string | null;

  @Column({ type: String, name: 'ip_address', nullable: true })
  ipAddress: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
