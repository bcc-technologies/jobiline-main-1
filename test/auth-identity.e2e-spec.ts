import {
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AppDataSource } from '../src/database/data-source';
import { AuthIdentityService } from '../src/auth/auth-identity.service';
import { AuthIdentityEntity } from '../src/auth/infrastructure/persistence/relational/entities/auth-identity.entity';
import { AccountStatus } from '../src/users/domain/account-status.enum';
import { UserEntity } from '../src/users/infrastructure/persistence/relational/entities/user.entity';
import { RoleEnum } from '../src/roles/roles.enum';
import { StatusEnum } from '../src/statuses/statuses.enum';
import { SocialInterface } from '../src/social/interfaces/social.interface';
import { APP_URL } from './utils/constants';

describe('AuthIdentityService relational', () => {
  const testPrefix = `auth-identity-${randomUUID()}`;
  let authIdentityService: AuthIdentityService;
  let users: ReturnType<typeof AppDataSource.getRepository<UserEntity>>;
  let identities: ReturnType<
    typeof AppDataSource.getRepository<AuthIdentityEntity>
  >;

  jest.setTimeout(30_000);

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    authIdentityService = new AuthIdentityService(AppDataSource);
    users = AppDataSource.getRepository(UserEntity);
    identities = AppDataSource.getRepository(AuthIdentityEntity);
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await users
        .createQueryBuilder()
        .delete()
        .where('"firstName" LIKE :prefix', { prefix: `${testPrefix}%` })
        .execute();
      await AppDataSource.destroy();
    }
  });

  function makeProfile(
    subject: string,
    email: string | undefined,
    emailVerified = true,
  ): SocialInterface {
    return {
      providerSubject: subject,
      email,
      emailVerified,
      firstName: `${testPrefix}-${subject}`,
      lastName: 'E2E',
    };
  }

  async function createVerifiedUser(email: string): Promise<UserEntity> {
    return users.save(
      users.create({
        email,
        password: null,
        firstName: `${testPrefix}-existing`,
        lastName: 'E2E',
        emailVerifiedAt: new Date(),
        accountStatus: AccountStatus.ACTIVE,
        role: { id: RoleEnum.user },
        roles: [{ id: RoleEnum.user }],
        status: { id: StatusEnum.active },
      }),
    );
  }

  it('should resolve an existing provider subject and update successful login timestamps', async () => {
    const email = `${testPrefix}-subject@example.com`;
    const unrelatedEmail = `${testPrefix}-unrelated@example.com`;
    await createVerifiedUser(unrelatedEmail);
    const firstLogin = await authIdentityService.authenticate(
      'google',
      makeProfile('existing-subject', email),
    );
    const secondLogin = await authIdentityService.authenticate(
      'google',
      makeProfile('existing-subject', unrelatedEmail, false),
    );
    const identity = await identities.findOneByOrFail({
      provider: 'google',
      providerSubject: 'existing-subject',
    });

    expect(secondLogin.id).toBe(firstLogin.id);
    expect(secondLogin.email).toBe(email);
    expect(identity.lastUsedAt).toBeInstanceOf(Date);
    expect(secondLogin.lastLoginAt).toBeInstanceOf(Date);
    expect(secondLogin).not.toHaveProperty('provider');
    expect(secondLogin).not.toHaveProperty('socialId');
    expect(secondLogin).not.toHaveProperty('authIdentities');
  });

  it('should link a verified provider email to one existing verified user', async () => {
    const email = `${testPrefix}-link@example.com`;
    const existingUser = await createVerifiedUser(email);

    const linked = await authIdentityService.authenticate(
      'apple',
      makeProfile('verified-link', ` ${email.toUpperCase()} `),
    );

    expect(Number(linked.id)).toBe(existingUser.id);
    expect(await users.countBy({ email })).toBe(1);
    expect(
      await identities.countBy({
        provider: 'apple',
        providerSubject: 'verified-link',
      }),
    ).toBe(1);
    await request(APP_URL)
      .post('/api/v1/auth/email/login')
      .send({ email, password: 'not-a-password' })
      .expect(422);
  });

  it('should reject an unverified provider email matching an existing user', async () => {
    const email = `${testPrefix}-unverified@example.com`;
    const existingUser = await createVerifiedUser(email);

    await expect(
      authIdentityService.authenticate(
        'facebook',
        makeProfile('unverified-link', email, false),
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(await users.countBy({ email })).toBe(1);
    expect(
      await identities.countBy({
        provider: 'facebook',
        providerSubject: 'unverified-link',
      }),
    ).toBe(0);
    expect(existingUser.email).toBe(email);
  });

  it('should create exactly one social-only user and identity with a null password', async () => {
    const email = `${testPrefix}-new@example.com`;
    const user = await authIdentityService.authenticate(
      'google',
      makeProfile('new-social-only', email),
    );
    const storedUser = await users.findOneByOrFail({ id: Number(user.id) });

    expect(storedUser.password).toBeNull();
    expect(storedUser.email).toBe(email);
    expect(await users.countBy({ email })).toBe(1);
    expect(
      await identities.countBy({
        provider: 'google',
        providerSubject: 'new-social-only',
      }),
    ).toBe(1);
  });

  it('should allow multiple provider identities to belong to the same user', async () => {
    const email = `${testPrefix}-multiple@example.com`;
    const googleUser = await authIdentityService.authenticate(
      'google',
      makeProfile('google-multiple', email),
    );
    const appleUser = await authIdentityService.authenticate(
      'apple',
      makeProfile('apple-multiple', email.toUpperCase()),
    );

    expect(appleUser.id).toBe(googleUser.id);
    expect(
      await identities.count({
        where: { user: { id: Number(googleUser.id) } },
      }),
    ).toBe(2);
  });

  it('should enforce provider and subject uniqueness at the persistence boundary', async () => {
    const user = await authIdentityService.authenticate(
      'google',
      makeProfile('unique-subject', `${testPrefix}-unique@example.com`),
    );
    const duplicate = identities.create({
      user: { id: Number(user.id) },
      provider: 'google',
      providerSubject: 'unique-subject',
      providerEmail: null,
      lastUsedAt: null,
    });

    await expect(identities.save(duplicate)).rejects.toMatchObject({
      driverError: { code: '23505' },
    });
  });

  it('should resolve concurrent first logins to one user and one identity', async () => {
    const email = `${testPrefix}-concurrent-create@example.com`;
    const results = await Promise.all([
      authIdentityService.authenticate(
        'google',
        makeProfile('concurrent-create', email),
      ),
      authIdentityService.authenticate(
        'google',
        makeProfile('concurrent-create', email),
      ),
    ]);

    expect(results[0].id).toBe(results[1].id);
    expect(await users.countBy({ email })).toBe(1);
    expect(
      await identities.countBy({
        provider: 'google',
        providerSubject: 'concurrent-create',
      }),
    ).toBe(1);
  });

  it('should resolve concurrent linking to an existing verified user', async () => {
    const email = `${testPrefix}-concurrent-link@example.com`;
    const existingUser = await createVerifiedUser(email);
    const results = await Promise.all([
      authIdentityService.authenticate(
        'apple',
        makeProfile('concurrent-link', email),
      ),
      authIdentityService.authenticate(
        'apple',
        makeProfile('concurrent-link', email),
      ),
    ]);

    expect(Number(results[0].id)).toBe(existingUser.id);
    expect(results[1].id).toBe(results[0].id);
    expect(await users.countBy({ email })).toBe(1);
    expect(
      await identities.countBy({
        provider: 'apple',
        providerSubject: 'concurrent-link',
      }),
    ).toBe(1);
  });

  it.each([AccountStatus.SUSPENDED, AccountStatus.DEACTIVATED])(
    'should reject social login for a %s account',
    async (status) => {
      const user = await authIdentityService.authenticate(
        'google',
        makeProfile(`blocked-${status}`, `${testPrefix}-${status}@example.com`),
      );
      await users.update(Number(user.id), { accountStatus: status });
      const userBefore = await users.findOneByOrFail({ id: Number(user.id) });
      const identityBefore = await identities.findOneByOrFail({
        provider: 'google',
        providerSubject: `blocked-${status}`,
      });

      await expect(
        authIdentityService.authenticate(
          'google',
          makeProfile(
            `blocked-${status}`,
            `${testPrefix}-${status}@example.com`,
          ),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      const identityAfter = await identities.findOneByOrFail({
        provider: 'google',
        providerSubject: `blocked-${status}`,
      });
      expect(identityAfter.lastUsedAt?.getTime()).toBe(
        identityBefore.lastUsedAt?.getTime(),
      );
      const userAfter = await users.findOneByOrFail({ id: Number(user.id) });
      expect(userAfter.lastLoginAt?.getTime()).toBe(
        userBefore.lastLoginAt?.getTime(),
      );
    },
  );
});
