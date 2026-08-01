"use client";

import { useMemo, useState } from "react";
import { createActivity } from "@feedclip/activity";
import { httpAdapter } from "@feedclip/activity/adapters/http";
import { ActivityPanel } from "@feedclip/activity/react";
import type { DemoSession } from "../lib/auth";

export function ActivityStarter({
  invoiceId,
  session,
}: {
  invoiceId: string;
  session: DemoSession | null;
}) {
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState("Draft");
  const [saving, setSaving] = useState(false);
  const activity = useMemo(() => createActivity({
    adapter: httpAdapter({ endpoint: "/api/activity" }),
  }), []);

  async function signIn(tenantId: string) {
    await fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });
    location.reload();
  }

  async function signOut() {
    await fetch("/api/session", { method: "DELETE" });
    location.reload();
  }

  async function changeStatus() {
    const next = status === "Draft" ? "Approved" : "Draft";
    setSaving(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ after: next }),
      });
      if (!response.ok) throw new Error("Could not update the invoice");
      setStatus(next);
      setRevision((value) => value + 1);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="starter-shell">
      <section className="starter-intro">
        <p className="starter-kicker">ACTIVITY · PRODUCTION STARTER</p>
        <h1>Authenticated, tenant-safe activity history.</h1>
        <p>
          The browser can query authorized activity. Only trusted server code
          records business events, using the actor from a signed session.
        </p>
      </section>

      {!session ? (
        <section className="starter-card">
          <h2>Choose a demo tenant</h2>
          <p>Both tenants use the same public invoice ID. Their histories remain isolated.</p>
          <div className="starter-actions">
            <button onClick={() => signIn("acme")}>Continue as Acme</button>
            <button className="secondary" onClick={() => signIn("globex")}>Continue as Globex</button>
          </div>
        </section>
      ) : (
        <>
          <section className="starter-toolbar">
            <div>
              <span>Signed in as {session.userName}</span>
              <strong>Tenant: {session.tenantId}</strong>
            </div>
            <div className="starter-actions">
              <button onClick={changeStatus} disabled={saving}>
                {saving ? "Saving…" : `Change status to ${status === "Draft" ? "Approved" : "Draft"}`}
              </button>
              <button className="secondary" onClick={signOut}>Switch tenant</button>
            </div>
          </section>
          <ActivityPanel
            key={revision}
            activity={activity}
            pageSize={20}
            resource={{ type: "invoice", id: invoiceId, title: `${session.tenantId} invoice #1001` }}
          />
        </>
      )}
    </main>
  );
}
