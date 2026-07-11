# MVP_SLICE.md

> **Status:** Accepted
> **Purpose:** Define the implementation roadmap from zero to Version 1.0 without losing focus on the product.

---

# 1. Why This Document Exists

The specification describes the target architecture of the Activity Platform.

This document defines **what must be built first**.

It prevents overengineering and keeps development focused on delivering value as early as possible.

---

# 2. Core Principle

The customer does **not** buy an Activity Engine.

The customer buys:

> **"A beautiful, production-ready Activity History that can be added to an application in minutes."**

The Engine is an implementation detail.

Activity History is the product.

---

# 3. Product Layers

The project consists of two different layers.

## External Product

Everything visible to customers.

Examples:

* Activity History
* Timeline UI
* Search
* Filters
* React Components
* Documentation
* Examples

This is what is marketed.

---

## Internal Architecture

Everything hidden from customers.

Examples:

* Activity Engine
* Pipeline
* Storage Adapter
* Query Engine
* Data Model

These exist only to make future capabilities reusable.

---

# 4. Development Strategy

The project is developed in four milestones.

Each milestone must produce a usable product.

Future milestones extend the architecture but must not break previous APIs.

---

# MVP-0

## Goal

Record activity and display it.

Nothing more.

---

## Mandatory

* createActivity()
* Activity Engine
* track()
* query()
* PostgreSQL Adapter
* ActivityPanel
* Update Activity Entries
* Comment Activity Entries
* Basic styling
* TypeScript support

---

## Explicitly Excluded

* Middleware
* Multiple adapters
* Virtualization
* Accessibility
* Localization
* Storybook
* Analytics
* Performance optimization
* Cursor pagination

---

## Success Criteria

A developer can:

1. Install the package.
2. Configure PostgreSQL.
3. Call track().
4. Display ActivityPanel.

Target time:

**Less than 15 minutes.**

---

# MVP-1

## Goal

Production-ready Activity History.

---

## Added Features

* Search
* Filters
* Attachments
* Custom Actions
* Better Empty States
* Better Error States
* Theme support
* Better documentation

---

## Still Deferred

* Audit SDK
* Timeline SDK
* Import Engine
* Approval SDK
* Comments SDK

---

# Beta

## Goal

Stable SDK suitable for production projects.

---

## Mandatory

* Middleware
* Custom Storage Adapters
* SQLite Adapter
* MySQL Adapter
* Storybook
* Accessibility improvements
* Localization
* Better benchmarks
* API stabilization

---

# Version 1.0

## Goal

Enterprise-ready platform.

---

## Mandatory

* Stable Public API
* Complete documentation
* Performance benchmarks
* Accessibility compliance
* Multiple adapters
* Extension API
* Migration guides
* Examples
* Production website

---

# 5. Requirements Classification

Every requirement belongs to one category.

## REQUIRED NOW

Must be implemented before MVP-0.

Examples

* createActivity()
* track()
* query()
* PostgreSQL Adapter
* ActivityPanel
* Data Model
* Engine
* Storage Adapter

---

## REQUIRED BEFORE BETA

Needed before public beta.

Examples

* Middleware
* Localization
* Better theming
* Storybook
* Custom Actions
* Better error handling

---

## REQUIRED BEFORE 1.0

Required for the first stable release.

Examples

* Accessibility
* Performance benchmarks
* Documentation website
* Adapter ecosystem
* Plugin documentation
* Migration tooling

---

# 6. Accepted Architectural Decisions

The following decisions are mandatory from the first line of code.

## AD-001

One Activity instance per application is the recommended architecture.

The SDK MUST allow multiple Activity instances for tests, multiple environments, and explicit application boundaries.

---

## AD-002

Applications create the Engine through:

```ts
createActivity(...)
```

---

## AD-003

Every write operation passes through the Engine.

Applications never bypass it.

---

## AD-004

The Engine communicates with persistence only through a Storage Adapter.

---

## AD-005

History is immutable.

Updates create new Activity Records.

---

## AD-006

Version 1 supports timelines for exactly one Resource.

Global feeds are intentionally excluded.

---

## AD-007

The Public API is designed for stability.

Internal implementation may change freely.

---

# 7. Accepted UI Decisions

## UI-001

React components receive an Activity instance directly.

Example:

```tsx
<ActivityPanel
    activity={activity}
    resource={{
        type: "invoice",
        id: invoice.id
    }}
/>
```

Reason:

* The Activity instance is explicit.
* No hidden context.
* No mandatory React Provider.
* Easier testing.
* Easier multiple Activity instances.
* Framework-independent architecture.

A Provider MAY be added later as an optional convenience layer.

It MUST NEVER be required.

---

# 8. Deferred Decisions

The following topics are intentionally postponed.

* Cursor pagination
* Global timeline
* Realtime updates
* Grouping
* Adapter plugins
* Telemetry
* Metrics
* Provider convenience API

These topics MUST NOT block MVP implementation.

---

# 9. Definition of MVP Success

The MVP is successful if an unfamiliar developer can:

* install the package;
* configure PostgreSQL;
* record activity;
* display a polished Activity History UI;
* complete the integration in less than 15 minutes.

If this goal is achieved, the MVP is complete even if many Version 1 features remain unfinished.

---

# 10. Guiding Rule

Whenever a design decision is unclear, ask:

> **"Does this help us ship a better Activity History MVP?"**

If the answer is **no**, postpone it to a later milestone.

This rule takes precedence over architectural perfection.

---

# 11. Specification Consistency Rule

If an architectural decision has been accepted, it MUST NOT also appear as an open question or deferred decision.

Accepted decisions replace uncertainty.
