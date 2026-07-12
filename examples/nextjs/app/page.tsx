"use client";

import { useMemo } from "react";
import { createActivity, createMemoryStorageAdapter } from "@feedclip/activity";
import { ActivityPanel } from "@feedclip/activity/react";

export default function Home() {
  const activity = useMemo(
    () => createActivity({ adapter: createMemoryStorageAdapter() }),
    [],
  );

  return (
    <main style={{ margin: "40px auto", maxWidth: 760 }}>
      <ActivityPanel
        activity={activity}
        entries={[]}
        resource={{ type: "invoice", id: "inv_next" }}
      />
    </main>
  );
}
