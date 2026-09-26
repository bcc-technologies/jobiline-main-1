import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

@Entity({ name: 'auth_identities' })
@Index(['provider', 'providerSubject'], { unique: true })
export class AuthIdentityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, (user) => user.authIdentities, {
    onDelete: 'CASCADE',
  })
  @Index()
  user: UserEntity;

  @Column({ type: String })
  provider: string;

  @Column({ type: String, name: 'provider_subject' })
  providerSubject: string;

  @Column({ type: String, name: 'provider_email', nullable: true })
  providerEmail: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', name: 'last_used_at', nullable: true })
  lastUsedAt: Date | null;
}
