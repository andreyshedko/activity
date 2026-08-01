# Database migrations

Activity migrations are forward-only and shipped in the npm package. Apply them
with the migration system already used by the host application. The initial schema
is available as `@feedclip/activity/migration.sql`.

## Existing databases

`001_activity_schema.sql` uses `create ... if not exists` and is safe to reapply.
CI verifies that reapplying it preserves existing Activity records. Always back up
production data and test against a staging copy before changing package versions.

## Upgrade process

1. Read `CHANGELOG.md` and any version-specific migration guide.
2. Back up the Activity tables.
3. Apply new migration files in numeric order exactly once through the host's
   migration runner.
4. Deploy application code after the schema step succeeds.
5. Run a resource query and verify insert/query health.

Destructive schema changes require an RFC, a migration guide, and a major version.
The SDK never runs migrations automatically.

SQLite uses a separate migration history under `migrations/sqlite` and exposes
its initial schema as `@feedclip/activity/sqlite-migration.sql`. Do not include
that directory in a PostgreSQL migration runner.

MySQL uses `migrations/mysql` and exposes its initial schema as
`@feedclip/activity/mysql-migration.sql`. Apply it with a MySQL migration runner
that supports multiple statements. MySQL timestamps are stored as UTC ISO 8601
text so cursor ordering and round trips do not depend on connection time zones.
