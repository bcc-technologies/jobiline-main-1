import { MigrationInterface, QueryRunner } from 'typeorm';

export class CanonicalizeAuthIdentity1790710200000 implements MigrationInterface {
  name = 'CanonicalizeAuthIdentity1790710200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('auth_identities'))) {
      throw new Error(
        'Cannot remove legacy social identity columns before auth_identities exists',
      );
    }

    const hasProvider = await queryRunner.hasColumn('user', 'provider');
    const hasSocialId = await queryRunner.hasColumn('user', 'socialId');

    if (hasProvider !== hasSocialId) {
      throw new Error('Expected both legacy identity columns on user');
    }

    if (hasProvider && hasSocialId) {
      const duplicateEmails: Array<{ count: string }> = await queryRunner.query(
        `SELECT COUNT(*)::text AS "count"
           FROM (
             SELECT NULLIF(LOWER(BTRIM("email")), '') AS normalized_email
             FROM "user"
             WHERE "email" IS NOT NULL
             GROUP BY NULLIF(LOWER(BTRIM("email")), '')
             HAVING COUNT(*) > 1
           ) duplicates`,
      );

      if (Number(duplicateEmails[0]?.count ?? 0) > 0) {
        throw new Error(
          'Cannot normalize user emails while case-insensitive duplicates exist',
        );
      }

      await queryRunner.query(
        `UPDATE "user"
         SET "email" = NULLIF(LOWER(BTRIM("email")), '')
         WHERE "email" IS NOT NULL`,
      );

      await queryRunner.query(
        `INSERT INTO "auth_identities" ("user_id", "provider", "provider_subject", "provider_email")
         SELECT "id", "provider", "socialId", NULLIF(LOWER(BTRIM("email")), '')
         FROM "user"
         WHERE "socialId" IS NOT NULL
         ON CONFLICT ("provider", "provider_subject") DO NOTHING`,
      );

      const missingBackfills: Array<{ count: string }> =
        await queryRunner.query(
          `SELECT COUNT(*)::text AS "count"
         FROM "user" u
         WHERE u."socialId" IS NOT NULL
           AND NOT EXISTS (
             SELECT 1
             FROM "auth_identities" ai
             WHERE ai."user_id" = u."id"
               AND ai."provider" = u."provider"
               AND ai."provider_subject" = u."socialId"
           )`,
        );

      if (Number(missingBackfills[0]?.count ?? 0) > 0) {
        throw new Error(
          'Legacy social identities could not all be backfilled safely',
        );
      }

      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_9bd2fe7a8e694dedc4ec2f666f"`,
      );
      await queryRunner.query(
        `ALTER TABLE "user" DROP COLUMN "socialId", DROP COLUMN "provider"`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('user', 'provider'))) {
      await queryRunner.query(
        `ALTER TABLE "user" ADD COLUMN "provider" character varying NOT NULL DEFAULT 'email'`,
      );
    }
    if (!(await queryRunner.hasColumn('user', 'socialId'))) {
      await queryRunner.query(
        `ALTER TABLE "user" ADD COLUMN "socialId" character varying`,
      );
    }

    if (await queryRunner.hasTable('auth_identities')) {
      await queryRunner.query(
        `WITH ranked_identities AS (
           SELECT "user_id", "provider", "provider_subject",
             ROW_NUMBER() OVER (
               PARTITION BY "user_id"
               ORDER BY "createdAt", "id"
             ) AS row_number
           FROM "auth_identities"
         )
         UPDATE "user" u
         SET "provider" = r."provider", "socialId" = r."provider_subject"
         FROM ranked_identities r
         WHERE r."user_id" = u."id" AND r.row_number = 1`,
      );
    }

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_9bd2fe7a8e694dedc4ec2f666f" ON "user" ("socialId")`,
    );
  }
}
