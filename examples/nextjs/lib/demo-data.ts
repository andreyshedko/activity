import type { ResourceReference } from "@feedclip/activity";
import type { DemoSession } from "./auth";

const invoices: Record<string, ResourceReference> = {
  acme: { type: "invoice", id: "inv_1001", title: "Acme invoice #1001" },
  globex: { type: "invoice", id: "inv_1001", title: "Globex invoice #1001" },
};

export function invoiceForSession(session: DemoSession, id: string): ResourceReference | null {
  const invoice = invoices[session.tenantId];
  return invoice?.id === id ? invoice : null;
}

export function canAccessInvoice(session: DemoSession, resource: ResourceReference): boolean {
  return resource.type === "invoice" && invoiceForSession(session, resource.id) !== null;
}

export const demoInvoiceId = "inv_1001";
