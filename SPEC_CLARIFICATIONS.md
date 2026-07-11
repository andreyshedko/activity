# SPEC_CLARIFICATIONS.md

> **Status:** Accepted
> **Version:** 1.0
> **Purpose:** Resolve contradictions and clarify implementation-critical decisions before the first build.

---

# 1. `track()` Return Value and Async Persistence

## Problem

Earlier specifications described `track()` as synchronous while StorageAdapter persistence is asynchronous.

This creates ambiguity.

---

## Decision

`activity.track()` MUST return a `Promise<ActivityRecord>`.

Example:

```ts
const record = await activity.track({
  resource: {
    type: "invoice",
    id: "inv_123",
    title: "Invoice INV-123",
  },
  actor: {
    type: "user",
    id: "user_1",
    name: "John Smith",
  },
  action: "update",
  changes: [
    {
      field: "status",
      label: "Status",
      before: "Draft",
      after: "Approved",
    },
  ],
});
```

Fire-and-forget usage is allowed explicitly:

```ts
void activity.track(input);
```

---

## Rationale

Persistence failure must be observable.

Validation errors must be catchable.

The API remains simple.

The implementation does not need a hidden queue in MVP.

---

## Supersedes

Any previous statement that `track()` is synchronous.

---

# 2. Custom Actions Typing

## Problem

Earlier specifications described `ActionType` as both:

1. a closed union; and
2. extensible with custom actions.

These are incompatible.

---

## Decision

Built-in actions are typed separately from custom actions.

```ts
type BuiltInAction =
  | "create"
  | "update"
  | "delete"
  | "archive"
  | "restore"
  | "comment"
  | "attachment";

type Action = BuiltInAction | (string & {});
```

The SDK MUST recognize built-in actions.

The SDK MUST allow custom string actions.

---

## Rendering Rule

Built-in actions receive default rendering.

Custom actions use generic rendering unless the application provides a custom renderer.

---

## Example

```ts
await activity.track({
  resource,
  actor,
  action: "payment.received",
  metadata: {
    amount: 120,
    currency: "EUR",
  },
});
```

---

## Rationale

The platform remains extensible.

TypeScript autocomplete remains useful for built-in actions.

Applications are not blocked by SDK-defined action lists.

---

# 3. MVP-0 vs Constitution Requirements

## Problem

The Constitution contains target-quality requirements such as:

* WCAG AA
* virtualization
* localization
* Storybook
* 100,000 entries
* full benchmarks

These are valid for the mature product but too heavy for MVP-0.

---

## Decision

Requirements are classified by milestone.

## Required for MVP-0

* `createActivity()`
* `activity.track()`
* `activity.query()`
* PostgreSQL adapter
* ActivityPanel
* Update entries
* Comment entries
* Lifecycle entries
* Basic empty state
* Basic loading state
* Basic error state
* TypeScript strict mode
* Local-first storage
* Direct Activity instance prop

---

## Deferred to MVP-1 / Beta / 1.0

* full WCAG AA audit
* virtualization
* localization
* Storybook
* multiple adapters
* middleware
* cursor pagination
* full performance benchmarks
* documentation website

---

## Rule

The Constitution defines the product quality bar.

`MVP_SLICE.md` defines what is mandatory for each milestone.

If there is tension between them during MVP-0, `MVP_SLICE.md` determines implementation priority.

---

# 4. One Activity Engine vs Multiple Activity Instances

## Problem

Earlier documents said:

> exactly one Activity Engine per application

but later public API examples allow passing an `activity` instance directly into components.

This creates ambiguity about whether multiple instances are allowed.

---

## Decision

The recommended architecture is one Activity instance per application.

However, the SDK MUST allow multiple Activity instances.

Example:

```ts
const primaryActivity = createActivity({
  adapter: postgresAdapter(primaryDb),
});

const testActivity = createActivity({
  adapter: memoryAdapter(),
});
```

React components receive the Activity instance explicitly.

```tsx
<ActivityPanel
  activity={primaryActivity}
  resource={{
    type: "invoice",
    id: "inv_123",
  }}
/>
```

---

## Provider Decision

`ActivityProvider` is NOT required in MVP.

A Provider MAY be added later as optional convenience.

It MUST NOT become mandatory.

---

## Rationale

Direct instances are explicit.

Testing is easier.

Multiple environments are easier.

No hidden React context is required.

The Engine remains framework-independent.

---

# 5. Documentation Consistency Rule

Each decision MUST have exactly one status:

* Accepted
* Draft
* Open
* Deferred

A decision MUST NOT appear as both Accepted and Deferred.

---

# 6. Updated Deferred Decisions

The following remain deferred:

* cursor pagination
* global feed
* realtime updates
* automatic grouping
* telemetry
* adapter plugin registry
* provider convenience API
* full localization system
* full accessibility audit
* hosted cloud mode

---

# 7. Current Implementation Baseline

The first implementation MUST target:

```text
createActivity()
activity.track()
activity.query()
postgresAdapter()
<ActivityPanel activity={activity} resource={resource} />
```

No Provider.

No global feed.

No hosted cloud.

No workflow.

No comments editor.

No approval flow.

No import engine.

---

# 8. Final Rule Before Coding

Implementation may begin once these four clarifications are applied across the specifications:

1. `track()` returns `Promise<ActivityRecord>`.
2. `Action = BuiltInAction | custom string`.
3. MVP requirements are milestone-scoped.
4. Direct Activity instance is the MVP React integration model.
