# Changelog

All notable changes to `@feedclip/activity` are documented here. The project
follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Updated the StackBlitz installation example to the published `0.8.0` package.
- Updated compatibility documentation for MySQL and the published `0.8.0`
  baseline, and made `compat:update` refresh the recorded baseline by default.
- Reworked the Next.js example into a production starter with signed sessions,
  resource authorization, tenant isolation, trusted server-side tracking, tests,
  and a five-minute PostgreSQL setup.
- Made the production starter install the published package directly, load its
  `.env.local` migration settings automatically, and linked it prominently from
  the npm README and GitHub Pages demo.
- Added a documentation hub with authentication and server-framework recipes,
  troubleshooting, customization, performance guidance, product comparisons,
  and structured onboarding feedback.
- Expanded the 100,000-row PostgreSQL performance contract to cover first-page,
  cursor, action-filter, and search queries, with a JSON CI artifact.
- Added a live ActivityPanel configurator for theme, density, locale and accent,
  with generated copyable JSX and CSS on GitHub Pages.
- Added a real-demo screenshot, evaluation paths, and a reproducible 60-second
  product walkthrough for honest product proof and release recording.

## [0.8.0] - 2026-08-01

### Added

- Added a dependency-free MySQL adapter, dialect-specific migration, executable
  quick start, and MySQL 8.0/8.4 integration coverage.

## [0.7.1] - 2026-08-01

### Fixed

- Fixed the provenance badge rendered in the npm README.

### Changed

- Updated the StackBlitz installation example from `0.5.0` to the current
  published `0.7.0` package.

## [0.7.0] - 2026-08-01

### Added

- Added sequential synchronous or asynchronous activity middleware for policy
  enforcement and metadata enrichment before persistence.
- Added isolated `beforeTrack`, `afterTrack`, and `trackFailed` lifecycle events
  for logging, metrics, and telemetry observers.
- Added a dependency-free SQLite adapter, schema migration, package entrypoint,
  executable quick start, and real in-memory integration coverage.

## [0.6.0] - 2026-07-31

### Added

- Added opaque cursor pagination across the memory, PostgreSQL, and HTTP
  adapters while preserving the existing offset API.
- Added opt-in `paginationMode="cursor"` support to `ActivityPanel` for stable
  keyset pagination on frequently changing activity streams.

## [0.5.1] - 2026-07-31

### Changed

- Updated the StackBlitz installation example to consume the published `0.5.0`
  package from npm.

## [0.5.0] - 2026-07-30

### Added

- Added a daily registry smoke test that installs the published package in a
  clean consumer project and verifies its public ESM, CommonJS, memory, and
  PostgreSQL flows.
- Added five-minute memory, PostgreSQL, and HTTP quick starts that execute in CI
  against the package's public entrypoints.
- Added compatibility gates for package entrypoints, ESM/CommonJS exports,
  TypeScript declarations, released migrations, public errors, and the HTTP wire
  protocol, based on the published `0.4.1` package.

### Changed

- Updated the StackBlitz installation example from `0.3.0` to the current
  published `0.4.1` package.

### Security

- Updated the Next.js example and its PostCSS and Sharp dependencies to patched
  versions covered by the example's CI audit gate.

## [0.4.1] - 2026-07-18

### Changed

- Reduced the npm package documentation to the public consumer README,
  changelog, license, runtime files, and database migration.
- Moved security, compatibility, migration-policy, API-stability, development,
  CI, and release-process details to GitHub instead of the npm package payload.
- Added a package verification gate that rejects internal documentation files.

## [0.4.0] - 2026-07-18

### Added

- Added `httpAdapter()` for browser-safe access to Activity APIs.
- Added `createActivityHttpHandler()` with required per-request authorization and
  server-side validation for standard Fetch runtimes.
- Added backward-compatible `queryPage()` access to `entries`, `total`, and
  `hasMore`.
- Added `ActivityPanel` pagination through `pageSize` and an accessible Load more
  flow.
- Added a Next.js App Router browser → route handler → PostgreSQL example.
- Added GitHub Pages deployment for the interactive product demo.

### Changed

- Updated StackBlitz to the published `0.3.0` package and its deep-link API.
- Added npm, CI, coverage, provenance, and license signals to the README.

## [0.3.0] - 2026-07-18

### Added

- Added controlled activity detail views through `expandedEntryId` and
  `onExpandedEntryChange` for router-independent deep links.
- Added stable `activity-entry-{id}` DOM targets for event permalinks.
- Added a URL-backed deep-link flow to the production demo and Playwright suite.

### Changed

- Clarified Activity's positioning as drop-in activity history and audit-trail
  infrastructure for React applications.
- Updated the release documentation for npm Trusted Publisher/OIDC publishing.

## [0.2.1] - 2026-07-16

### Added

- Added this changelog to the npm package and linked it from the README.

## [0.2.0] - 2026-07-16

### Added

- Added light, dark, and system themes with CSS custom-property overrides.
- Added explicit loading, refreshing, empty, error, retry, and custom-renderer states.
- Added product-specific entry actions and host-controlled attachment opening.
- Added configurable attachment size, MIME type, and URL protocol policies.
- Added PostgreSQL migration verification and a 100,000-row performance gate.
- Added public API declaration snapshots and compatibility documentation.
- Added clean-package consumer tests for ESM, CommonJS, React 18, and React 19.
- Added StackBlitz and Next.js installation examples.

### Changed

- Expanded CI to Node.js 20/22, React 18/19, and PostgreSQL 14–17.
- Expanded Playwright coverage to Chromium, Firefox, and WebKit.
- Enforced 100% unit-test coverage and automated WCAG accessibility checks.
- Hardened release verification, package-content limits, and secret scanning.

### Security

- Attachment URLs default to HTTPS and are delegated to the host application
  for authorization and short-lived download delivery.

## [0.1.1] - 2026-07-14

### Changed

- Prepared the package for independent publishing under `@feedclip/activity`.

## [0.1.0] - 2026-07-14

### Added

- Initial activity engine, React panel, memory adapter, and PostgreSQL adapter.

[Unreleased]: https://github.com/andreyshedko/activity/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/andreyshedko/activity/compare/v0.7.1...v0.8.0
[0.7.1]: https://github.com/andreyshedko/activity/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/andreyshedko/activity/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/andreyshedko/activity/compare/v0.5.1...v0.6.0
[0.5.1]: https://github.com/andreyshedko/activity/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/andreyshedko/activity/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/andreyshedko/activity/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/andreyshedko/activity/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/andreyshedko/activity/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/andreyshedko/activity/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/andreyshedko/activity/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/andreyshedko/activity/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/andreyshedko/activity/releases/tag/v0.1.0
