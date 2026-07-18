import assert from "node:assert/strict";
import test from "node:test";
import { ActivityError, createMemoryStorageAdapter, type ActivityRecord } from "../src";
import { httpAdapter } from "../src/adapters/http";
import { createActivityHttpHandler } from "../src/http";

const record: ActivityRecord = Object.freeze({
  id: "evt_http_1",
  resource: Object.freeze({ type: "invoice", id: "inv_1", title: "Invoice 1" }),
  action: "comment",
  actor: Object.freeze({ type: "user", id: "usr_1", name: "Ada" }),
  timestamp: new Date("2026-07-18T10:00:00.000Z"),
  content: Object.freeze({ type: "comment", text: "Approved" }),
});

test("HTTP adapter validates configuration", () => {
  assert.throws(() => httpAdapter({ endpoint: " " }), /endpoint is required/i);
  const originalFetch = globalThis.fetch;
  Object.defineProperty(globalThis, "fetch", { configurable: true, value: undefined });
  try {
    assert.throws(() => httpAdapter({ endpoint: "/api/activity" }), /Fetch API/);
  } finally {
    Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch });
  }
});

test("HTTP adapter serializes complete queries and revives records", async () => {
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;
  const adapter = httpAdapter({
    endpoint: "https://example.test/api/activity?tenant=acme",
    headers: async () => new Headers({ authorization: "Bearer test" }),
    fetch: async (input, init) => {
      requestedUrl = String(input);
      requestedInit = init;
      return Response.json({
        entries: [{ ...record, timestamp: record.timestamp.toISOString() }],
        total: 4,
        hasMore: true,
      });
    },
  });

  const result = await adapter.query({
    resource: record.resource,
    search: "approved",
    actor: "Ada",
    actorId: "usr_1",
    actions: ["comment"],
    from: new Date("2026-01-01T00:00:00.000Z"),
    to: new Date("2026-12-31T00:00:00.000Z"),
    limit: 10,
    offset: 2,
  });

  const url = new URL(requestedUrl);
  assert.equal(url.searchParams.get("tenant"), "acme");
  assert.equal(url.searchParams.get("resourceTitle"), "Invoice 1");
  assert.equal(url.searchParams.get("search"), "approved");
  assert.equal(url.searchParams.get("actor"), "Ada");
  assert.equal(url.searchParams.get("actorId"), "usr_1");
  assert.equal(url.searchParams.get("actions"), '["comment"]');
  assert.equal(url.searchParams.get("from"), "2026-01-01T00:00:00.000Z");
  assert.equal(url.searchParams.get("to"), "2026-12-31T00:00:00.000Z");
  assert.equal(url.searchParams.get("limit"), "10");
  assert.equal(url.searchParams.get("offset"), "2");
  assert.equal(new Headers(requestedInit?.headers).get("authorization"), "Bearer test");
  assert.equal(result.entries[0].timestamp instanceof Date, true);
  assert.deepEqual({ total: result.total, hasMore: result.hasMore }, { total: 4, hasMore: true });
});

test("HTTP adapter inserts records and supports relative endpoints", async () => {
  const requests: Array<{ input: string; init?: RequestInit }> = [];
  const adapter = httpAdapter({
    endpoint: "/api/activity",
    headers: { "x-tenant": "acme" },
    fetch: async (input, init) => {
      requests.push({ input: String(input), init });
      return init?.method === "POST"
        ? Response.json({ ok: true }, { status: 201 })
        : Response.json({ entries: [] });
    },
  });
  await adapter.insert(record);
  const result = await adapter.query({ resource: { type: "invoice", id: "inv_1" } });
  assert.equal(requests[0].input, "/api/activity");
  assert.equal(new Headers(requests[0].init?.headers).get("content-type"), "application/json");
  assert.match(String(requests[0].init?.body), /evt_http_1/);
  assert.match(requests[1].input, /^\/api\/activity\?/);
  assert.deepEqual(result, { entries: [], total: 0, hasMore: false });
});

test("HTTP adapter normalizes transport and response failures", async () => {
  const failures: Array<() => Promise<unknown>> = [
    () => httpAdapter({ endpoint: "/api", fetch: async () => { throw new Error("offline"); } }).query({ resource: record.resource }),
    () => httpAdapter({ endpoint: "/api", fetch: async () => { throw "offline"; } }).query({ resource: record.resource }),
    () => httpAdapter({ endpoint: "/api", fetch: async () => new Response("", { status: 503 }) }).query({ resource: record.resource }),
    () => httpAdapter({ endpoint: "/api", fetch: async () => Response.json({ error: "Denied" }, { status: 403 }) }).query({ resource: record.resource }),
    () => httpAdapter({ endpoint: "/api", fetch: async () => new Response("nope") }).query({ resource: record.resource }),
    () => httpAdapter({ endpoint: "/api", fetch: async () => Response.json({ nope: true }) }).query({ resource: record.resource }),
    () => httpAdapter({ endpoint: "/api", fetch: async () => Response.json({ entries: [{ timestamp: 42 }] }) }).query({ resource: record.resource }),
    () => httpAdapter({ endpoint: "/api", fetch: async () => Response.json({ entries: [{ timestamp: "bad" }] }) }).query({ resource: record.resource }),
  ];
  for (const failure of failures) await assert.rejects(failure, ActivityError);
});

test("HTTP handler queries, authorizes, and inserts validated records", async () => {
  const adapter = createMemoryStorageAdapter([record]);
  const authorizations: string[] = [];
  const handler = createActivityHttpHandler({
    adapter,
    authorize({ operation, resource }) {
      authorizations.push(`${operation}:${resource.id}`);
      return resource.id === "inv_1";
    },
  });

  const query = await handler(new Request(
    "https://example.test/api/activity?resourceType=invoice&resourceId=inv_1&resourceTitle=Invoice%201&search=Approved&actor=Ada&actorId=usr_1&actions=%5B%22comment%22%5D&from=2026-01-01T00%3A00%3A00.000Z&to=2026-12-31T00%3A00%3A00.000Z&limit=1&offset=0",
  ));
  assert.equal(query.status, 200);
  assert.equal((await query.json()).entries.length, 1);

  const insertRecord = { ...record, id: "evt_http_2", timestamp: record.timestamp.toISOString() };
  const insert = await handler(new Request("https://example.test/api/activity", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(insertRecord),
  }));
  assert.equal(insert.status, 201);
  assert.deepEqual(authorizations, ["query:inv_1", "insert:inv_1"]);
  assert.equal((await adapter.query({ resource: record.resource })).total, 2);
});

test("HTTP handler rejects unauthorized, malformed, and unsupported requests", async () => {
  const handler = createActivityHttpHandler({
    adapter: createMemoryStorageAdapter(),
    authorize: () => false,
  });
  const responses = await Promise.all([
    handler(new Request("https://example.test/api?resourceType=invoice&resourceId=blocked")),
    handler(new Request("https://example.test/api", { method: "PUT" })),
    handler(new Request("https://example.test/api?resourceType=invoice")),
    handler(new Request("https://example.test/api?resourceType=invoice&resourceId=inv&actions=%7B%7D")),
    handler(new Request("https://example.test/api?resourceType=invoice&resourceId=inv&actions=%5B1%5D")),
    handler(new Request("https://example.test/api?resourceType=invoice&resourceId=inv&from=bad")),
    handler(new Request("https://example.test/api?resourceType=invoice&resourceId=inv&limit=1.5")),
    handler(new Request("https://example.test/api?resourceType=invoice&resourceId=inv&offset=-1")),
    handler(new Request("https://example.test/api", { method: "POST", body: "{}" })),
    handler(new Request("https://example.test/api", { method: "POST", body: JSON.stringify({ id: "x", timestamp: "bad" }) })),
    handler(new Request("https://example.test/api", { method: "POST", body: "{" })),
  ]);
  assert.deepEqual(responses.map((response) => response.status), [403, 405, 400, 400, 400, 400, 400, 403, 400, 400, 400]);
  assert.equal(responses[1].headers.get("allow"), "GET, POST");

  const authorized = createActivityHttpHandler({
    adapter: createMemoryStorageAdapter(),
    authorize: () => true,
  });
  assert.equal(
    (await authorized(new Request("https://example.test/api?resourceType=invoice&resourceId=inv&offset=-1"))).status,
    400,
  );
});

test("HTTP handler denies unauthorized inserts and isolates storage failures", async () => {
  const observed: string[] = [];
  const denied = createActivityHttpHandler({
    adapter: createMemoryStorageAdapter(),
    authorize: () => false,
  });
  const deniedResponse = await denied(new Request("https://example.test/api", {
    method: "POST",
    body: JSON.stringify({ ...record, timestamp: record.timestamp.toISOString() }),
  }));
  assert.equal(deniedResponse.status, 403);

  const failing = createActivityHttpHandler({
    adapter: {
      async insert() { throw new Error("database offline"); },
      async query() { throw new Error("database offline"); },
    },
    authorize: () => true,
    onError: (error) => observed.push(error.message),
  });
  const failure = await failing(new Request("https://example.test/api?resourceType=invoice&resourceId=inv_1"));
  assert.equal(failure.status, 500);
  assert.deepEqual(await failure.json(), { error: "Activity request failed" });

  const postFailure = await failing(new Request("https://example.test/api", {
    method: "POST",
    body: JSON.stringify({
      ...record,
      action: "update",
      content: undefined,
      changes: [{ field: "status", label: "Status", before: "Draft", after: "Paid", valueType: "enum" }],
      timestamp: record.timestamp.toISOString(),
    }),
  }));
  assert.equal(postFailure.status, 500);
  assert.deepEqual(observed, ["database offline", "database offline"]);

  const unknownFailure = createActivityHttpHandler({
    adapter: createMemoryStorageAdapter(),
    authorize() { throw "unknown"; },
  });
  const unknown = await unknownFailure(new Request("https://example.test/api?resourceType=invoice&resourceId=inv_1"));
  assert.deepEqual(await unknown.json(), { error: "Activity request failed" });
});
