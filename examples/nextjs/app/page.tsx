"use client";

import { Suspense, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createActivity,
  createMemoryStorageAdapter,
  type ActivityRecord,
} from "@feedclip/activity";
import { ActivityPanel } from "@feedclip/activity/react";

export default function Home() {
  return (
    <Suspense fallback={<main style={{ margin: "40px auto", maxWidth: 760 }}>Loading activity…</main>}>
      <ActivityExample />
    </Suspense>
  );
}

function ActivityExample() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const expandedEntryId = searchParams.get("activity");
  const activity = useMemo(
    () => createActivity({ adapter: createMemoryStorageAdapter(seedEntries) }),
    [],
  );

  return (
    <main style={{ margin: "40px auto", maxWidth: 760 }}>
      <ActivityPanel
        activity={activity}
        expandedEntryId={expandedEntryId}
        onExpandedEntryChange={(entryId) => {
          const next = new URLSearchParams(searchParams);
          entryId ? next.set("activity", entryId) : next.delete("activity");
          router.replace(`${pathname}?${next.toString()}`, { scroll: false });
        }}
        resource={{ type: "invoice", id: "inv_next" }}
      />
    </main>
  );
}

const seedEntries: ActivityRecord[] = [
  Object.freeze({
    id: "evt_next_1",
    resource: Object.freeze({ type: "invoice", id: "inv_next", title: "INV-2048" }),
    action: "update",
    actor: Object.freeze({ type: "user", id: "usr_1", name: "Ada Lovelace" }),
    timestamp: new Date("2026-07-18T09:30:00.000Z"),
    changes: Object.freeze([
      Object.freeze({
        field: "status",
        label: "Status",
        before: "Draft",
        after: "Approved",
        valueType: "enum",
      }),
    ]),
  }),
];
