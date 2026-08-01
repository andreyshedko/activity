# Performance and large histories

Activity uses server pagination; the browser does not render all rows in a
100 000-entry dataset. The supported scale claim is therefore two separate
budgets:

1. the database must find a resource page efficiently inside a large table;
2. the panel must render and interact with the configured page size.

CI creates 100 000 PostgreSQL entries, analyzes the table, warms every scenario,
then measures 20 samples for each of:

- the first resource page;
- a cursor page;
- an action-filtered page;
- resource-scoped full-text search.
- single-record transactional writes.

The default contract is p95 below 100 ms per scenario on a GitHub Actions
PostgreSQL service:

```bash
DATABASE_URL=postgresql://... npm run benchmark:postgres
```

Override dataset size or threshold for your environment:

```bash
ACTIVITY_BENCHMARK_ROWS=1000000 \
ACTIVITY_BENCHMARK_P95_MS=150 \
npm run benchmark:postgres
```

Use cursor pagination for frequently changing histories. Keep `pageSize` between
20 and 100 unless measurements justify a larger DOM. Virtualization is not a
substitute for database pagination and is not currently required for the bounded
page rendered by `ActivityPanel`.

Before production, benchmark with your real distribution of tenant/resource IDs,
search terms, changes and content. Shared CI results are regression guards, not a
latency guarantee for a specific cloud database.

Every verify job uploads `postgres-performance-report` as a JSON artifact with
dataset size, threshold, median and p95 for each scenario. This makes performance
changes reviewable instead of relying on an undocumented local run.
