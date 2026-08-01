# Public API stability

## Scope

The reviewed public surface is the declarations exported by:

- `@feedclip/activity`
- `@feedclip/activity/react`
- `@feedclip/activity/adapters/memory`
- `@feedclip/activity/adapters/postgres`
- `@feedclip/activity/adapters/sqlite`
- `@feedclip/activity/adapters/mysql`
- `@feedclip/activity/adapters/http`
- `@feedclip/activity/http`
- `@feedclip/activity/styles.css`
- `@feedclip/activity/migration.sql`
- `@feedclip/activity/sqlite-migration.sql`
- `@feedclip/activity/mysql-migration.sql`

CI compares declarations with `api/public-api.snapshot.txt`, runtime error and
HTTP behavior with `api/runtime-contract.snapshot.json`, and the complete package
surface with `api/compatibility-baseline.json`. The compatibility baseline was
generated from the published `@feedclip/activity@0.4.1` registry tarball and
protects entrypoints, ESM/CommonJS exports, declarations, and released migrations.
It also freezes exported CSS because documented custom properties are a public
customization contract. Any intentional contract change requires an explicit
snapshot or baseline update and changelog review.

## Compatibility policy

Activity follows Semantic Versioning. Before 1.0, breaking public API changes are
allowed only in a minor release and must include migration guidance. Patch releases
must remain backward-compatible. Starting with 1.0, breaking changes require a
major release.

Database migrations are independently forward-only. Destructive schema changes
require an RFC, migration guide, and major release even before 1.0.

## Deprecation policy

Public APIs should be marked deprecated for at least one minor release before
removal. Deprecations must include a replacement in TypeScript JSDoc, changelog,
and migration documentation. Security fixes may use an accelerated path when the
old API cannot remain safely available.

## Experimental surfaces

The demo application, benchmark scripts, internal CSS class names, and files not
listed in `package.json#exports` are not public API. CSS custom properties prefixed
with `--activity-` and documented React props are public customization contracts.

## Compatibility review commands

- `npm run api:check` checks the reviewed declaration snapshot.
- `npm run compat:check` checks backward compatibility with the published baseline.
- `npm run contract:check` checks public errors and the HTTP wire contract.
- `npm run compat:update` may only be used when deliberately adopting a new
  published compatibility baseline after release review.
- A reviewed minor release candidate may use
  `API_BASELINE_PACKAGE=. npm run compat:update` when it intentionally adds
  public declarations; existing consumer scenarios must remain covered by tests.
