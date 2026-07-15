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
