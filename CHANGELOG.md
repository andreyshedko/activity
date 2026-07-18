# Changelog

All notable changes to `@feedclip/activity` are documented here. The project
follows [Semantic Versioning](https://semver.org/).

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

[0.3.0]: https://github.com/andreyshedko/activity/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/andreyshedko/activity/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/andreyshedko/activity/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/andreyshedko/activity/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/andreyshedko/activity/releases/tag/v0.1.0
