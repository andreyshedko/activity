# Public API stability

## Scope

The reviewed public surface is the declarations exported by:

- `@feedclip/activity`
- `@feedclip/activity/react`
- `@feedclip/activity/adapters/memory`
- `@feedclip/activity/adapters/postgres`

CI compares these declarations with `api/public-api.snapshot.txt`. Any addition,
removal, or type change requires an explicit snapshot update and changelog review.

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
