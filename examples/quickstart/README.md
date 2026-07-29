# Executable quick starts

These examples are the complete runnable versions of the snippets in the root
README. The project's `test:quickstart` command builds the package and executes
all three against its public package entrypoints.

- `memory.mjs` — in-process setup with no infrastructure
- `postgres.mjs` — bundled migration and persistent storage
- `http.mjs` — browser adapter to an authorized Fetch-compatible handler

Run the memory and HTTP examples:

```bash
npm run test:quickstart
```

Include the PostgreSQL example by providing a disposable database:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/activity npm run test:quickstart
```
