# Compatibility

## Supported contract

| Surface | Supported | CI verified |
|---|---|---|
| Node.js | 20 and 22 | 20 and 22 |
| React | 18 and 19 | 18 and 19 on both Node versions |
| PostgreSQL | 14–17 | 14, 15, 16, and 17 |
| SQLite | Synchronous `prepare/run/get/all` drivers | Node 22 built-in SQLite |
| MySQL | `mysql2/promise`-compatible pools and connections | MySQL 8.0 and 8.4 |
| Module systems | ESM and CommonJS | Both package builds |
| Browsers | Current evergreen browsers | Chromium, Firefox, and WebKit via Playwright |
| Next.js | App Router consumer | Production smoke build |

Support means reported compatibility issues are treated as bugs. CI verified means
the exact combination is exercised on every change. The verification matrix will
expand before 1.0.

The package does not require a CSS framework. Browser consumers must support CSS
custom properties, `Intl.DateTimeFormat`, and standard ES2020 output.

PostgreSQL migrations remain in the root `migrations` directory. SQLite and
MySQL have independent dialect-specific histories under `migrations/sqlite` and
`migrations/mysql`; never apply one database dialect's migration files to another.
