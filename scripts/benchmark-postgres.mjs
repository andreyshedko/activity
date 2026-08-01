import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
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
  const resource = { type: "invoice", id: "inv_42" };
  const firstPage = await adapter.query({ resource, limit: 50 });
  if (!firstPage.nextCursor) throw new Error("Benchmark dataset did not produce a cursor");
  const scenarios = [
    { name: "resource-page", query: { resource, limit: 50 }, expected: 50 },
    { name: "cursor-page", query: { resource, limit: 25, cursor: firstPage.nextCursor }, expected: 25 },
    { name: "action-filter", query: { resource, limit: 25, actions: ["update"] }, expected: 25 },
    { name: "resource-search", query: { resource, limit: 50, search: "Invoice 42" }, expected: 50 },
  ];
  const results = [];
  for (const scenario of scenarios) results.push(await measure(adapter, scenario, thresholdMs));
  const write = await measureWrites(adapter, thresholdMs);
  const report = {
    datasetSize,
    generatedAt: new Date().toISOString(),
    samplesPerScenario: 20,
    thresholdMs,
    scenarios: results,
    write,
  };
  console.log(JSON.stringify(report, null, 2));
} finally {
  await pool.end();
}

async function measureWrites(adapter, threshold) {
  const samples = [];
  for (let index = 0; index < 20; index += 1) {
    const entry = Object.freeze({
      id: randomUUID(),
      resource: Object.freeze({ type: "benchmark-write", id: "resource_1" }),
      action: "update",
      actor: Object.freeze({ type: "system", id: "benchmark", name: "Benchmark" }),
      timestamp: new Date(),
      changes: [Object.freeze({ field: "sequence", label: "Sequence", after: index, valueType: "number" })],
    });
    const start = performance.now();
    await adapter.insert(entry);
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(samples.length / 2)];
  const p95 = samples[Math.ceil(samples.length * 0.95) - 1];
  if (p95 > threshold) throw new Error(`single-write p95 ${p95.toFixed(2)}ms exceeds ${threshold}ms`);
  return {
    name: "single-write",
    samples: samples.length,
    medianMs: Number(median.toFixed(2)),
    p95Ms: Number(p95.toFixed(2)),
  };
}

async function measure(adapter, scenario, threshold) {
  for (let index = 0; index < 5; index += 1) await adapter.query(scenario.query);
  const samples = [];
  for (let index = 0; index < 20; index += 1) {
    const start = performance.now();
    const result = await adapter.query(scenario.query);
    samples.push(performance.now() - start);
    if (result.entries.length !== scenario.expected) {
      throw new Error(`${scenario.name} returned ${result.entries.length}, expected ${scenario.expected}`);
    }
  }
  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(samples.length / 2)];
  const p95 = samples[Math.ceil(samples.length * 0.95) - 1];
  if (p95 > threshold) {
    throw new Error(`${scenario.name} p95 ${p95.toFixed(2)}ms exceeds ${threshold}ms`);
  }
  return {
    name: scenario.name,
    medianMs: Number(median.toFixed(2)),
    p95Ms: Number(p95.toFixed(2)),
  };
}
