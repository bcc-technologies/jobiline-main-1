import { MigrationInterface, QueryRunner } from 'typeorm';

export class EstablishIdentityFoundation20260920140000 implements MigrationInterface {
  name = 'EstablishIdentityFoundation20260920140000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "password" TO "password_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "phone" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "displayName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "preferredLanguage" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "timezone" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "emailVerifiedAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "phoneVerifiedAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "lastLoginAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE TYPE "user_account_status_enum" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "account_status" "user_account_status_enum" NOT NULL DEFAULT 'PENDING_VERIFICATION'`,
    );
    await queryRunner.query(
      `UPDATE "user" SET "account_status" = CASE WHEN "statusId" = 1 THEN 'ACTIVE'::"user_account_status_enum" ELSE 'PENDING_VERIFICATION'::"user_account_status_enum" END`,
    );
    await queryRunner.query(
      `UPDATE "user" SET "emailVerifiedAt" = now() WHERE "statusId" = 1 AND "email" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_user_phone_unique" ON "user" ("phone") WHERE "phone" IS NOT NULL AND "deletedAt" IS NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "role" ADD COLUMN "code" character varying`,
    );
    await queryRunner.query(
      `UPDATE "role" SET "code" = CASE WHEN "id" = 1 THEN 'SUPER_ADMIN' WHEN "id" = 2 THEN 'USER' ELSE UPPER("name") END WHERE "code" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ALTER COLUMN "code" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_role_code_unique" ON "role" ("code")`,
    );
    await queryRunner.query(
      `INSERT INTO "role" ("id", "name", "code") VALUES (3, 'Support', 'SUPPORT'), (4, 'Analyst', 'ANALYST'), (5, 'Moderator', 'MODERATOR') ON CONFLICT ("id") DO NOTHING`,
    );

    await queryRunner.query(
      `CREATE TABLE "auth_identities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" integer NOT NULL, "provider" character varying NOT NULL, "provider_subject" character varying NOT NULL, "provider_email" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "last_used_at" TIMESTAMP, CONSTRAINT "PK_auth_identities" PRIMARY KEY ("id"), CONSTRAINT "UQ_auth_identity_provider_subject" UNIQUE ("provider", "provider_subject"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_identities_user_id" ON "auth_identities" ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_identities" ADD CONSTRAINT "FK_auth_identities_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO "auth_identities" ("user_id", "provider", "provider_subject", "provider_email") SELECT "id", "provider", "socialId", "email" FROM "user" WHERE "socialId" IS NOT NULL ON CONFLICT ("provider", "provider_subject") DO NOTHING`,
    );

    await queryRunner.query(
      `CREATE TABLE "user_roles" ("user_id" integer NOT NULL, "role_id" integer NOT NULL, "assigned_at" TIMESTAMP NOT NULL DEFAULT now(), "assigned_by" integer, CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id"))`,
    );
    await queryRunner.query(
      `INSERT INTO "user_roles" ("user_id", "role_id") SELECT "id", "roleId" FROM "user" WHERE "roleId" IS NOT NULL ON CONFLICT DO NOTHING`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_roles_role_id" ON "user_roles" ("role_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "session" RENAME COLUMN "hash" TO "refresh_token_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" ADD COLUMN "token_family_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" ADD COLUMN "expiresAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" ADD COLUMN "last_used_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" ADD COLUMN "revoked_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" ADD COLUMN "revocation_reason" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" ADD COLUMN "user_agent" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" ADD COLUMN "ip_address" character varying`,
    );
    await queryRunner.query(
      `UPDATE "session" SET "token_family_id" = uuid_generate_v4(), "expiresAt" = now() + interval '30 days' WHERE "token_family_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" ALTER COLUMN "token_family_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" ALTER COLUMN "expiresAt" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_session_token_family_id" ON "session" ("token_family_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_session_token_family_id"`,
    );
    await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "ip_address"`);
    await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "user_agent"`);
    await queryRunner.query(
      `ALTER TABLE "session" DROP COLUMN "revocation_reason"`,
    );
    await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "revoked_at"`);
    await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "last_used_at"`);
    await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "expiresAt"`);
    await queryRunner.query(
      `ALTER TABLE "session" DROP COLUMN "token_family_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" RENAME COLUMN "refresh_token_hash" TO "hash"`,
    );
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP TABLE "auth_identities"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_role_code_unique"`);
    await queryRunner.query(`ALTER TABLE "role" DROP COLUMN "code"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_phone_unique"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "lastLoginAt"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "phoneVerifiedAt"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "emailVerifiedAt"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "timezone"`);
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "preferredLanguage"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "displayName"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "phone"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "account_status"`);
    await queryRunner.query(`DROP TYPE "user_account_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "password_hash" TO "password"`,
    );
  }
}
