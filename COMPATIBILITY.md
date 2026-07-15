# Compatibility

## Supported contract

| Surface | Supported | CI verified |
|---|---|---|
| Node.js | 20 and 22 | 22 |
| React | 18 and 19 | 19 |
| PostgreSQL | 14–17 | 16 |
| Module systems | ESM and CommonJS | Both package builds |
| Browsers | Current evergreen browsers | Chromium via Playwright |
| Next.js | App Router consumer | Production smoke build |

Support means reported compatibility issues are treated as bugs. CI verified means
the exact combination is exercised on every change. The verification matrix will
expand before 1.0.

The package does not require a CSS framework. Browser consumers must support CSS
custom properties, `Intl.DateTimeFormat`, and standard ES2020 output.
