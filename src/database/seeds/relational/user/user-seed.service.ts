import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { RoleEnum } from '../../../../roles/roles.enum';
import { StatusEnum } from '../../../../statuses/statuses.enum';
import { UserEntity } from '../../../../users/infrastructure/persistence/relational/entities/user.entity';
import { AccountStatus } from '../../../../users/domain/account-status.enum';

@Injectable()
export class UserSeedService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async run() {
    const countAdmin = await this.repository.count({
      where: {
        role: {
          id: RoleEnum.admin,
        },
      },
    });

    if (!countAdmin) {
      const salt = await bcrypt.genSalt();
      const password = await bcrypt.hash('secret', salt);

      const admin = await this.repository.save(
        this.repository.create({
          firstName: 'Super',
          lastName: 'Admin',
          email: 'admin@example.com',
          password,
          role: {
            id: RoleEnum.admin,
            name: 'Admin',
            code: 'SUPER_ADMIN',
          },
          status: {
            id: StatusEnum.active,
            name: 'Active',
          },
          accountStatus: AccountStatus.ACTIVE,
        }),
      );
      await this.repository.manager.query(
        `INSERT INTO "user_roles" ("user_id", "role_id") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [admin.id, RoleEnum.admin],
      );
    }

    const countUser = await this.repository.count({
      where: {
        role: {
          id: RoleEnum.user,
        },
      },
    });

    if (!countUser) {
      const salt = await bcrypt.genSalt();
      const password = await bcrypt.hash('secret', salt);

      const user = await this.repository.save(
        this.repository.create({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          password,
          role: {
            id: RoleEnum.user,
            name: 'User',
            code: 'USER',
          },
          status: {
            id: StatusEnum.active,
            name: 'Active',
          },
          accountStatus: AccountStatus.ACTIVE,
        }),
      );
      await this.repository.manager.query(
        `INSERT INTO "user_roles" ("user_id", "role_id") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [user.id, RoleEnum.user],
      );
    }
  }
}
