# Release checklist

## Before creating a release

- [ ] Confirm the version in `package.json` and `package-lock.json`.
- [ ] Move relevant entries from `Unreleased` in `CHANGELOG.md`.
- [ ] Run `npm test`, `npm run build`, and `npm audit --audit-level=moderate`.
- [ ] Run the Next.js smoke build in `examples/nextjs`.
- [ ] Confirm CI is green on `main` with the PostgreSQL integration test enabled.
- [ ] Confirm `npm whoami` has publish access to the `@feedclip` scope.
- [ ] Configure the GitHub `npm` environment and `NPM_TOKEN` secret.
- [ ] Inspect `npm pack --dry-run` and verify package entrypoints.

## Publishing

- [ ] Create tag `vX.Y.Z` matching `package.json` exactly.
- [ ] Publish a GitHub Release from that tag.
- [ ] Wait for the Release workflow to publish with npm provenance.
- [ ] Verify the package and provenance on npm.
- [ ] Install the published package in a clean consumer project.

The Release workflow refuses to publish when the release tag and package version differ.
