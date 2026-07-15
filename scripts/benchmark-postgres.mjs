import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import pg from "pg";
import { postgresAdapter } from "../dist/adapters/postgres.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for the PostgreSQL benchmark");

const datasetSize = Number(process.env.ACTIVITY_BENCHMARK_ROWS ?? 100_000);
const thresholdMs = Number(process.env.ACTIVITY_BENCHMARK_P95_MS ?? 100);
const pool = new pg.Pool({ connectionString });

try {
  const migration = await readFile("migrations/001_activity_schema.sql", "utf8");
  await pool.query(migration);
  await pool.query("truncate activity_changes, activity_entries cascade");
  await pool.query(
    `insert into activity_entries (
      id, resource_type, resource_id, resource_title, action,
      actor_type, actor_id, actor_name, metadata_json, created_at
    )
    select
      md5(series::text)::uuid,
      'invoice',
      'inv_' || (series % 1000)::text,
      'Invoice ' || (series % 1000)::text,
      case when series % 3 = 0 then 'update' else 'comment' end,
      'system',
      'benchmark',
      'Benchmark',
      jsonb_build_object('series', series),
      now() - (series || ' milliseconds')::interval
    from generate_series(1, $1::int) as series`,
    [datasetSize],
  );
  await pool.query("analyze activity_entries");

  const adapter = postgresAdapter(pool);
  const query = { resource: { type: "invoice", id: "inv_42" }, limit: 50 };
  for (let index = 0; index < 5; index += 1) await adapter.query(query);

  const samples = [];
  for (let index = 0; index < 20; index += 1) {
    const start = performance.now();
    const result = await adapter.query(query);
    samples.push(performance.now() - start);
    if (result.entries.length !== 50) throw new Error("Benchmark query returned an unexpected page");
  }
  samples.sort((a, b) => a - b);
  const p95 = samples[Math.ceil(samples.length * 0.95) - 1];
  const report = {
    datasetSize,
    samples: samples.length,
    medianMs: Number(samples[Math.floor(samples.length / 2)].toFixed(2)),
    p95Ms: Number(p95.toFixed(2)),
    thresholdMs,
  };
  console.log(JSON.stringify(report, null, 2));
  if (p95 > thresholdMs) {
    throw new Error(`PostgreSQL timeline p95 ${p95.toFixed(2)}ms exceeds ${thresholdMs}ms`);
  }
} finally {
  await pool.end();
}
