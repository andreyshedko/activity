import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { ActivityError, createActivity, createMemoryStorageAdapter } from "../dist/index.js";
import { createActivityHttpHandler } from "../dist/http.js";

const snapshotPath = "api/runtime-contract.snapshot.json";
const contract = JSON.parse(JSON.stringify(await observeContract()));
const serialized = `${JSON.stringify(contract, null, 2)}\n`;

if (process.argv.includes("--update")) {
  await writeFile(snapshotPath, serialized);
  console.log(`Updated ${snapshotPath}`);
} else {
  const expected = JSON.parse(await readFile(snapshotPath, "utf8"));
  assert.deepEqual(contract, expected, "Public error or HTTP runtime contract changed");
  console.log("Public error and HTTP runtime contracts match the reviewed snapshot.");
}

async function observeContract() {
  const adapter = createMemoryStorageAdapter();
  const activity = createActivity({ adapter });
  const invalidTrack = await captureError(() => activity.track({
    resource: { type: "", id: "invoice" },
    actor: { type: "user", id: "user", name: "User" },
    action: "create",
  }));
  const invalidQuery = await captureError(() => activity.query({
    resource: { type: "invoice", id: "invoice" },
    limit: 0,
  }));
  const directError = new ActivityError("EXAMPLE", "Example", "field");
  const authorizedOperations = [];
  const handler = createActivityHttpHandler({
    adapter,
    authorize: ({ operation, resource }) => {
      authorizedOperations.push({ operation, resource });
      return true;
    },
  });
  const denied = createActivityHttpHandler({ adapter, authorize: () => false });
  const queryUrl = "https://example.test/api/activity?resourceType=invoice&resourceId=invoice";
  const record = {
    id: "00000000-0000-4000-8000-000000000001",
    resource: { type: "invoice", id: "invoice" },
    action: "create",
    actor: { type: "system", id: "contract", name: "Contract" },
    timestamp: "2026-07-30T00:00:00.000Z",
  };

  return {
    errors: {
      shape: { name: directError.name, code: directError.code, field: directError.field },
      invalidTrack,
      invalidQuery,
    },
    http: {
      forbidden: await response(await denied(new Request(queryUrl))),
      invalidQuery: await response(await handler(new Request("https://example.test/api/activity"))),
      methodNotAllowed: await response(await handler(new Request(queryUrl, { method: "PUT" }))),
      insert: await response(await handler(new Request("https://example.test/api/activity", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(record),
      }))),
      query: await response(await handler(new Request(queryUrl))),
      authorizedOperations,
    },
  };
}

async function captureError(operation) {
  try {
    await operation();
    throw new Error("Expected operation to fail");
  } catch (error) {
    assert(error instanceof ActivityError);
    return { name: error.name, code: error.code, field: error.field };
  }
}

async function response(value) {
  return {
    status: value.status,
    allow: value.headers.get("allow"),
    contentType: value.headers.get("content-type"),
    body: await value.json(),
  };
}
