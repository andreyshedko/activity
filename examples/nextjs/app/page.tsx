"use client";

import { Suspense, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createActivity } from "@feedclip/activity";
import { httpAdapter } from "@feedclip/activity/adapters/http";
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
    () => createActivity({
      adapter: httpAdapter({
        endpoint: "/api/activity",
        headers: { "x-activity-demo-user": "demo" },
      }),
    }),
    [],
  );

  return (
    <main style={{ margin: "40px auto", maxWidth: 760 }}>
      <ActivityPanel
        activity={activity}
        expandedEntryId={expandedEntryId}
        pageSize={20}
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
