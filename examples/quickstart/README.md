# Executable quick starts

These examples are the complete runnable versions of the snippets in the root
README. The project's `test:quickstart` command builds the package and executes
all six against its public package entrypoints.

- `memory.mjs` — in-process setup with no infrastructure
- `headless.mjs` — headless feed/export plus redaction, batch and telemetry
- `postgres.mjs` — bundled migration and persistent storage
- `http.mjs` — browser adapter to an authorized Fetch-compatible handler
- `sqlite.mjs` — local SQLite persistence through Node's built-in driver
- `mysql.mjs` — bundled MySQL migration and persistent storage

Run the memory and HTTP examples:

```bash
npm run test:quickstart
```

Include the PostgreSQL example by providing a disposable database:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/activity npm run test:quickstart
```

Include MySQL in the same command with a disposable database:

```bash
MYSQL_URL=mysql://user:password@localhost:3306/activity npm run test:quickstart
```
