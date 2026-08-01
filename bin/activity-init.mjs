#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: feedclip-activity init [directory] [options]

Options:
  --template react-memory|next-postgres  Starter to generate (default: react-memory)
  --force                                Replace generated files that already exist
  --help                                 Show this help

Examples:
  npx @feedclip/activity init
  npx @feedclip/activity init . --template next-postgres`);
  process.exit(0);
}

const command = args[0] && !args[0].startsWith("-") ? args.shift() : "init";
if (command !== "init") fail(`Unknown command: ${command}`);

let directory = ".";
let template = "react-memory";
let force = false;
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (argument === "--force") force = true;
  else if (argument === "--template") template = args[++index];
  else if (!argument.startsWith("-") && directory === ".") directory = argument;
  else fail(`Unknown option: ${argument}`);
}

function fail(message) {
  console.error(`activity init: ${message}`);
  process.exit(1);
}

const memoryActivity = `import { createActivity, createMemoryStorageAdapter } from "@feedclip/activity";

export const activity = createActivity({
  adapter: createMemoryStorageAdapter(),
});
`;

const memoryPanel = `import { ActivityPanel } from "@feedclip/activity/react";
import "@feedclip/activity/styles.css";
import { activity } from "./activity";

export function ActivityHistory({ resourceId }: { resourceId: string }) {
  return (
    <ActivityPanel
      activity={activity}
      resource={{ type: "resource", id: resourceId }}
      paginationMode="cursor"
    />
  );
}
`;

const nextServer = `import "server-only";
import { createActivity } from "@feedclip/activity";
import { postgresAdapter } from "@feedclip/activity/adapters/postgres";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const activity = createActivity({ adapter: postgresAdapter(pool) });
`;

const nextRoute = `import { createActivityHttpHandler } from "@feedclip/activity/http";
import { activity } from "../../../activity/server";

const handler = createActivityHttpHandler({
  activity,
  authorize: async ({ request, resource }) => {
    // Replace with your session and tenant-aware resource authorization.
    return Boolean(request.headers.get("authorization") && resource.id);
  },
});

export const GET = handler;
export const POST = handler;
`;

const nextClient = `"use client";

import { ActivityPanel } from "@feedclip/activity/react";
import { httpAdapter } from "@feedclip/activity/adapters/http";
import { createActivity } from "@feedclip/activity";
import "@feedclip/activity/styles.css";

const activity = createActivity({
  adapter: httpAdapter({ endpoint: "/api/activity" }),
});

export function ActivityHistory({ resourceId }: { resourceId: string }) {
  return (
    <ActivityPanel
      activity={activity}
      resource={{ type: "resource", id: resourceId }}
      paginationMode="cursor"
    />
  );
}
`;

const nextTrack = `import { activity } from "./server";

export async function trackStatusChange(input: {
  resourceId: string;
  actor: { id: string; name: string };
  before: string;
  after: string;
}) {
  return activity.track({
    resource: { type: "resource", id: input.resourceId },
    actor: { type: "user", id: input.actor.id, name: input.actor.name },
    action: "update",
    changes: [{
      field: "status",
      label: "Status",
      before: input.before,
      after: input.after,
      valueType: "enum",
    }],
  });
}
`;

const templates = {
  async "react-memory"() {
    return {
      "src/activity.ts": memoryActivity,
      "src/ActivityHistory.tsx": memoryPanel,
      "ACTIVITY_SETUP.md": `# Activity setup\n\n1. Run \`npm install @feedclip/activity\`.\n2. Render \`<ActivityHistory resourceId="example" />\`.\n3. Call \`activity.track(...)\` after a successful business operation.\n\nMemory storage is for evaluation and tests. Choose the \`next-postgres\` template for durable production storage.\n`,
    };
  },
  async "next-postgres"() {
    const migration = await readFile(
      new URL("../migrations/001_activity_schema.sql", import.meta.url),
      "utf8",
    );
    return {
      "activity/server.ts": nextServer,
      "activity/track.ts": nextTrack,
      "app/api/activity/route.ts": nextRoute,
      "components/ActivityHistory.tsx": nextClient,
      "migrations/001_activity_schema.sql": migration,
      ".env.activity.example": "DATABASE_URL=postgresql://localhost:5432/app\n",
      "ACTIVITY_SETUP.md": `# Activity setup\n\n1. Run \`npm install @feedclip/activity pg\` and \`npm install -D @types/pg\`.\n2. Set \`DATABASE_URL\` and apply \`migrations/001_activity_schema.sql\`.\n3. Replace the placeholder authorization in \`app/api/activity/route.ts\` with your session, tenant and resource checks.\n4. Render \`<ActivityHistory resourceId="example" />\`.\n5. Call \`trackStatusChange\` from trusted server code after the business operation succeeds.\n\nNever accept the authoritative actor or tenant directly from the browser. See https://github.com/andreyshedko/activity/tree/main/docs/authentication.md.\n`,
    };
  },
};

if (!templates[template]) {
  fail(`Unknown template: ${template}. Use react-memory or next-postgres.`);
}

const target = resolve(process.cwd(), directory);
const files = await templates[template]();
const written = [];

for (const [relativePath, contents] of Object.entries(files)) {
  const destination = join(target, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  if (!force) {
    try {
      await readFile(destination);
      fail(`${relativePath} already exists. Re-run with --force to replace generated files.`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  await writeFile(destination, contents);
  written.push(relativePath);
}

console.log(`Created Activity ${template} starter in ${target}`);
for (const file of written) console.log(`  ${file}`);
console.log("Next: open ACTIVITY_SETUP.md and complete the dependency and environment steps.");
