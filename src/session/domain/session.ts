import { User } from '../../users/domain/user';

export class Session {
  id: number | string;
  user: User;
  hash: string;
  tokenFamilyId: string;
  expiresAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  revocationReason: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}
