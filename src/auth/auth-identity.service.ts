import {
  HttpStatus,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { SocialInterface } from '../social/interfaces/social.interface';
import { AccountStatus } from '../users/domain/account-status.enum';
import { User } from '../users/domain/user';
import { UserMapper } from '../users/infrastructure/persistence/relational/mappers/user.mapper';
import { RoleEnum } from '../roles/roles.enum';
import { StatusEnum } from '../statuses/statuses.enum';
import { AuthIdentityEntity } from './infrastructure/persistence/relational/entities/auth-identity.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { normalizeEmail } from '../utils/normalize-email';

@Injectable()
export class AuthIdentityService {
  constructor(private readonly dataSource: DataSource) {}

  async authenticate(
    provider: string,
    socialData: SocialInterface,
  ): Promise<User> {
    const providerSubject = socialData.providerSubject.trim();
    const providerEmail = normalizeEmail(socialData.email);

    if (!providerSubject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { user: 'wrongToken' },
      });
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.dataSource.transaction((manager) =>
          this.resolveInTransaction(
            manager,
            provider,
            providerSubject,
            providerEmail,
            socialData,
          ),
        );
      } catch (error) {
        if (attempt === 0 && this.isUniqueViolation(error)) {
          continue;
        }
        throw error;
      }
    }

    throw new UnauthorizedException();
  }

  private async resolveInTransaction(
    manager: EntityManager,
    provider: string,
    providerSubject: string,
    providerEmail: string | null,
    socialData: SocialInterface,
  ): Promise<User> {
    const identities = manager.getRepository(AuthIdentityEntity);
    const users = manager.getRepository(UserEntity);
    const identity = await identities.findOne({
      where: { provider, providerSubject },
      relations: { user: true },
    });

    let userEntity = identity?.user ?? null;
    let resolvedIdentity = identity;

    if (!identity) {
      const matchingUsers = providerEmail
        ? await users
            .createQueryBuilder('user')
            .where('LOWER(BTRIM(user.email)) = :email', {
              email: providerEmail,
            })
            .getMany()
        : [];
      const userByEmail = matchingUsers[0] ?? null;

      if (matchingUsers.length > 1) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { email: 'emailAlreadyExists' },
        });
      }

      if (userByEmail) {
        if (!socialData.emailVerified || !userByEmail.emailVerifiedAt) {
          throw new UnprocessableEntityException({
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: { email: 'emailNotVerified' },
          });
        }
        userEntity = userByEmail;
      } else {
        const email = socialData.emailVerified ? providerEmail : null;
        const now = new Date();
        userEntity = users.create({
          email,
          password: null,
          firstName: socialData.firstName ?? null,
          lastName: socialData.lastName ?? null,
          emailVerifiedAt: email ? now : null,
          accountStatus: AccountStatus.ACTIVE,
          role: { id: RoleEnum.user },
          roles: [{ id: RoleEnum.user }],
          status: { id: StatusEnum.active },
        });
        userEntity = await users.save(userEntity);
      }

      resolvedIdentity = await identities.save(
        identities.create({
          user: userEntity,
          provider,
          providerSubject,
          providerEmail,
          lastUsedAt: null,
        }),
      );
    }

    if (!userEntity) {
      throw new UnauthorizedException();
    }

    if (
      userEntity.accountStatus === AccountStatus.SUSPENDED ||
      userEntity.accountStatus === AccountStatus.DEACTIVATED
    ) {
      throw new UnauthorizedException();
    }

    await identities
      .createQueryBuilder()
      .update(AuthIdentityEntity)
      .set({ lastUsedAt: () => 'CURRENT_TIMESTAMP' })
      .where('id = :id', { id: resolvedIdentity!.id })
      .execute();

    await users
      .createQueryBuilder()
      .update(UserEntity)
      .set({ lastLoginAt: () => 'CURRENT_TIMESTAMP' })
      .where('id = :id', { id: userEntity.id })
      .execute();

    const authenticatedUser = await users.findOne({
      where: { id: userEntity.id },
    });

    if (!authenticatedUser) {
      throw new UnauthorizedException();
    }

    return UserMapper.toDomain(authenticatedUser);
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'driverError' in error &&
      typeof error.driverError === 'object' &&
      error.driverError !== null &&
      'code' in error.driverError &&
      error.driverError.code === '23505'
    );
  }
}
