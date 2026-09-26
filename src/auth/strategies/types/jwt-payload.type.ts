import { Session } from '../../../session/domain/session';
import { User } from '../../../users/domain/user';

export type JwtPayloadType = Pick<User, 'id' | 'role' | 'roles'> & {
  sessionId: Session['id'];
  iat: number;
  exp: number;
};
