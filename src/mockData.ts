import type { ActivityRecord, Resource } from "./activity";

export type DemoResource = {
  resource: Resource;
  productArea: string;
  description: string;
  updatedAt: string;
  primaryAction: string;
  secondaryAction: string;
  fields: Array<[label: string, value: string]>;
};

const invoice: DemoResource = {
  resource: {
    type: "invoice",
    id: "inv_1042",
    title: "Invoice INV-1042",
  },
  productArea: "Billing",
  description: "Customer invoice for Northstar Supply, ready for collection.",
  updatedAt: "09:31",
  primaryAction: "Mark paid",
  secondaryAction: "Download",
  fields: [
    ["Customer", "Northstar Supply"],
    ["Status", "Approved"],
    ["Amount", "EUR 90"],
    ["Due date", "18 Jun 2026"],
    ["Owner", "Sarah Chen"],
    ["Terms", "Net 30"],
  ],
};

const customer: DemoResource = {
  resource: {
    type: "customer",
    id: "cus_northstar",
    title: "Northstar Supply",
  },
  productArea: "CRM",
  description: "Account record shared by support, sales, and billing workflows.",
  updatedAt: "10:12",
  primaryAction: "Open account",
  secondaryAction: "Copy link",
  fields: [
    ["Segment", "Enterprise"],
    ["Owner", "Amara Imani"],
    ["Health", "Watch"],
    ["Region", "EU"],
    ["Plan", "Business"],
    ["Renewal", "12 Sep 2026"],
  ],
};

const payment: DemoResource = {
  resource: {
    type: "payment",
    id: "pay_9021",
    title: "Payment PAY-9021",
  },
  productArea: "Payments",
  description: "Payment attempt tracked across API, dashboard, and risk review.",
  updatedAt: "08:47",
  primaryAction: "Retry",
  secondaryAction: "Receipt",
  fields: [
    ["Status", "Requires review"],
    ["Amount", "EUR 90"],
    ["Method", "Card"],
    ["Risk", "Elevated"],
    ["Processor", "Stripe"],
    ["Attempt", "2"],
  ],
};

const ticket: DemoResource = {
  resource: {
    type: "ticket",
    id: "tic_8840",
    title: "Ticket TIC-8840",
  },
  productArea: "Support",
  description: "Support case with user, agent, and automation activity in one stream.",
  updatedAt: "11:04",
  primaryAction: "Assign",
  secondaryAction: "Escalate",
  fields: [
    ["Priority", "High"],
    ["Status", "Open"],
    ["Requester", "Northstar Supply"],
    ["Assignee", "Mina Patel"],
    ["SLA", "4 hours"],
    ["Channel", "Email"],
  ],
};

export const demoResources = [invoice, customer, payment, ticket];

export const activityEntries: ActivityRecord[] = [
  {
    id: "evt_1007",
    action: "update",
    resource: invoice.resource,
    actor: { type: "user", id: "usr_john", name: "John Smith" },
    timestamp: new Date("2026-07-06T09:31:00+02:00"),
    metadata: { source: "Web App", version: "v124" },
    changes: [
      {
        field: "status",
        label: "Status",
        before: "Draft",
        after: "Approved",
        valueType: "enum",
      },
      {
        field: "amount",
        label: "Amount",
        before: "EUR 120",
        after: "EUR 90",
        valueType: "currency",
      },
      {
        field: "due_date",
        label: "Due date",
        before: "12 Jun",
        after: "18 Jun",
        valueType: "date",
      },
      {
        field: "assignee",
        label: "Assignee",
        before: "Unassigned",
        after: "Sarah Chen",
        valueType: "user",
      },
    ],
  },
  {
    id: "evt_1006",
    action: "comment",
    resource: invoice.resource,
    actor: { type: "user", id: "usr_sarah", name: "Sarah Chen" },
    timestamp: new Date("2026-07-06T09:18:00+02:00"),
    metadata: { source: "Web App", version: "v124" },
    content: {
      type: "comment",
      text: "Customer confirmed the updated delivery window.",
    },
  },
  {
    id: "evt_1005",
    action: "attachment",
    resource: invoice.resource,
    actor: { type: "user", id: "usr_mike", name: "Mike Rivera" },
    timestamp: new Date("2026-07-06T08:42:00+02:00"),
    metadata: { source: "API", version: "v123" },
    content: {
      type: "attachment",
      fileName: "contract-v3.pdf",
      mimeType: "application/pdf",
      size: 248_000,
    },
  },
  {
    id: "evt_1004",
    action: "update",
    resource: invoice.resource,
    actor: { type: "agent", id: "agent_collector", name: "Collections Agent" },
    timestamp: new Date("2026-07-05T17:11:00+02:00"),
    metadata: { source: "Agent", version: "v123" },
    changes: [
      {
        field: "payment_terms",
        label: "Payment terms",
        before: "Net 45",
        after: "Net 30",
        valueType: "string",
      },
    ],
  },
  {
    id: "evt_1003",
    action: "archive",
    resource: invoice.resource,
    actor: { type: "user", id: "usr_sarah", name: "Sarah Chen" },
    timestamp: new Date("2026-07-05T14:04:00+02:00"),
    metadata: {
      source: "Web App",
      version: "v122",
      reason: "Duplicate invoice",
    },
  },
  {
    id: "evt_1002",
    action: "create",
    resource: invoice.resource,
    actor: { type: "user", id: "usr_john", name: "John Smith" },
    timestamp: new Date("2026-07-01T11:26:00+02:00"),
    metadata: { source: "Web App", version: "v118" },
  },
  {
    id: "evt_2005",
    action: "update",
    resource: customer.resource,
    actor: { type: "agent", id: "agent_health", name: "Health Agent" },
    timestamp: new Date("2026-07-06T10:12:00+02:00"),
    metadata: { source: "Agent", version: "v124" },
    changes: [
      {
        field: "health",
        label: "Health",
        before: "Good",
        after: "Watch",
        valueType: "enum",
      },
      {
        field: "renewal_risk",
        label: "Renewal risk",
        before: "Low",
        after: "Medium",
        valueType: "enum",
      },
    ],
  },
  {
    id: "evt_2004",
    action: "comment",
    resource: customer.resource,
    actor: { type: "user", id: "usr_amara", name: "Amara Imani" },
    timestamp: new Date("2026-07-06T09:52:00+02:00"),
    metadata: { source: "CRM", version: "v84" },
    content: {
      type: "comment",
      text: "Procurement asked for the renewal checklist before Friday.",
    },
  },
  {
    id: "evt_2003",
    action: "update",
    resource: customer.resource,
    actor: { type: "user", id: "usr_luca", name: "Luca Rossi" },
    timestamp: new Date("2026-07-05T16:40:00+02:00"),
    metadata: { source: "API", version: "v83" },
    changes: [
      {
        field: "owner",
        label: "Owner",
        before: "Mina Patel",
        after: "Amara Imani",
        valueType: "user",
      },
    ],
  },
  {
    id: "evt_2002",
    action: "create",
    resource: customer.resource,
    actor: { type: "user", id: "usr_mina", name: "Mina Patel" },
    timestamp: new Date("2026-06-28T14:05:00+02:00"),
    metadata: { source: "CRM", version: "v79" },
  },
  {
    id: "evt_3005",
    action: "update",
    resource: payment.resource,
    actor: { type: "system", id: "sys_risk", name: "Risk Engine" },
    timestamp: new Date("2026-07-06T08:47:00+02:00"),
    metadata: { source: "Risk API", version: "v45" },
    changes: [
      {
        field: "risk",
        label: "Risk",
        before: "Normal",
        after: "Elevated",
        valueType: "enum",
      },
      {
        field: "status",
        label: "Status",
        before: "Processing",
        after: "Requires review",
        valueType: "enum",
      },
    ],
  },
  {
    id: "evt_3004",
    action: "comment",
    resource: payment.resource,
    actor: { type: "user", id: "usr_mike", name: "Mike Rivera" },
    timestamp: new Date("2026-07-06T08:33:00+02:00"),
    metadata: { source: "Dashboard", version: "v31" },
    content: {
      type: "comment",
      text: "Hold retry until the customer confirms card ownership.",
    },
  },
  {
    id: "evt_3003",
    action: "update",
    resource: payment.resource,
    actor: { type: "system", id: "sys_processor", name: "Processor Webhook" },
    timestamp: new Date("2026-07-06T08:21:00+02:00"),
    metadata: { source: "Webhook", version: "v31" },
    changes: [
      {
        field: "attempt",
        label: "Attempt",
        before: "1",
        after: "2",
        valueType: "number",
      },
    ],
  },
  {
    id: "evt_3002",
    action: "create",
    resource: payment.resource,
    actor: { type: "system", id: "sys_checkout", name: "Checkout API" },
    timestamp: new Date("2026-07-06T08:18:00+02:00"),
    metadata: { source: "API", version: "v31" },
  },
  {
    id: "evt_4005",
    action: "update",
    resource: ticket.resource,
    actor: { type: "agent", id: "agent_triage", name: "Triage Agent" },
    timestamp: new Date("2026-07-06T11:04:00+02:00"),
    metadata: { source: "Automation", version: "v18" },
    changes: [
      {
        field: "priority",
        label: "Priority",
        before: "Normal",
        after: "High",
        valueType: "enum",
      },
      {
        field: "assignee",
        label: "Assignee",
        before: "Unassigned",
        after: "Mina Patel",
        valueType: "user",
      },
    ],
  },
  {
    id: "evt_4004",
    action: "comment",
    resource: ticket.resource,
    actor: { type: "user", id: "usr_mina", name: "Mina Patel" },
    timestamp: new Date("2026-07-06T10:58:00+02:00"),
    metadata: { source: "Support", version: "v18" },
    content: {
      type: "comment",
      text: "Asked billing to confirm whether the duplicate invoice was voided.",
    },
  },
  {
    id: "evt_4003",
    action: "attachment",
    resource: ticket.resource,
    actor: { type: "user", id: "usr_customer", name: "Northstar Supply" },
    timestamp: new Date("2026-07-06T10:47:00+02:00"),
    metadata: { source: "Email", version: "v18" },
    content: {
      type: "attachment",
      fileName: "screenshot-billing-error.png",
      mimeType: "image/png",
      size: 482_000,
    },
  },
  {
    id: "evt_4002",
    action: "create",
    resource: ticket.resource,
    actor: { type: "user", id: "usr_customer", name: "Northstar Supply" },
    timestamp: new Date("2026-07-06T10:42:00+02:00"),
    metadata: { source: "Email", version: "v18" },
  },
];
