# Next.js + PostgreSQL example

This App Router example keeps database credentials on the server:

```text
ActivityPanel → httpAdapter → /api/activity → authorization → postgresAdapter
```

Before running it, apply `../../migrations/001_activity_schema.sql` to PostgreSQL
and provide the connection string:

```bash
export DATABASE_URL=postgresql://user:password@host/database
npm install
npm run dev
```

The `x-activity-demo-user` header is intentionally only a visible example seam.
Replace it with your application's authenticated session and verify tenant access
to every requested resource inside `authorize`.
