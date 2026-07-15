# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added light, dark, and system themes to `ActivityPanel` through a typed `theme`
  prop and customizable `--activity-*` CSS properties.
- Added retryable error states, non-blocking refresh feedback, variant-aware
  loading skeletons, and custom empty/error renderers to `ActivityPanel`.
- Added typed, record-aware custom entry actions with conditional visibility,
  disabled states, optional icons, and keyboard-accessible controls.
- Added an enforced 100% unit/component coverage gate and Playwright browser E2E
  coverage for search, filters, resources, expansion, tracking, and async states.
- Added attachment validation policies, safe URL defaults, host-controlled opening,
  browser coverage, and production security/compatibility documentation.
- Added existing-data migration verification, a forward-only migration guide, and
  a PostgreSQL 100,000-row p95 performance gate.
- Added Node 20/22, React 18/19, and PostgreSQL 14–17 CI matrices plus a reviewed
  public TypeScript API snapshot gate and deprecation policy.

## [0.1.1] - 2026-07-14

### Fixed

- Widened `ActivityPanelMessages` values from default string literals to `string`,
  allowing consumers to provide localized and product-specific UI copy as intended.

## [0.1.0] - 2026-07-12

### Added

- Framework-independent Activity engine with immutable records.
- Memory and PostgreSQL storage adapters.
- Resource-scoped search, filters, deterministic ordering, and offset pagination.
- React ActivityPanel with controlled and uncontrolled modes.
- Localizable UI messages and locale-aware date formatting.
- Inline expansion, keyboard navigation, loading, empty, and error states.
- ESM, CommonJS, TypeScript declarations, isolated CSS, and SQL migration exports.
- Unit, React accessibility, PostgreSQL integration, package-consumer, and CI checks.
- Next.js App Router smoke example.

[Unreleased]: https://github.com/andreyshedko/activity/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/andreyshedko/activity/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/andreyshedko/activity/releases/tag/v0.1.0
