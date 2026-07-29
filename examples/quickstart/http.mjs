import assert from "node:assert/strict";
import { createActivity } from "@feedclip/activity";
import { httpAdapter } from "@feedclip/activity/adapters/http";
import { createMemoryStorageAdapter } from "@feedclip/activity/adapters/memory";
import { createActivityHttpHandler } from "@feedclip/activity/http";

const token = "quick-start-token";
const handleActivity = createActivityHttpHandler({
  adapter: createMemoryStorageAdapter(),
  authorize: ({ request }) => request.headers.get("authorization") === `Bearer ${token}`,
});

// In a browser, omit `fetch`: the adapter calls your real `/api/activity` route.
const routeFetch = (input, init) => {
  const url = new URL(String(input), "https://example.test");
  return handleActivity(new Request(url, init));
};
const activity = createActivity({
  adapter: httpAdapter({
    endpoint: "/api/activity",
    fetch: routeFetch,
    headers: { authorization: `Bearer ${token}` },
  }),
});
const resource = { type: "invoice", id: "inv_http" };

await activity.track({
  resource,
  actor: { type: "user", id: "user_1", name: "John Smith" },
  action: "comment",
  content: { type: "comment", text: "Ready for payment" },
});

const entries = await activity.query({ resource, search: "payment" });
assert.equal(entries.length, 1);
assert.equal(entries[0].action, "comment");
console.log("HTTP quick start passed");
