# Activity project handoff

Last updated: 2026-08-08.

This is the durable context for continuing work on Activity. Read this file before
planning or changing the product; verify GitHub and npm state because releases,
pull requests and dependency advisories can change after the date above.

## Canonical locations

- Activity repository: `/Users/macandreyshedko/projects/Activity`
- GitHub: `git@github.com:andreyshedko/activity.git`
- npm: `@feedclip/activity`
- Live demo and configurator: <https://andreyshedko.github.io/activity/>
- Documentation hub: [`README.md`](README.md)
- Production starter: [`../examples/nextjs/README.md`](../examples/nextjs/README.md)

The old `/Users/macandreyshedko/Documents/Activity` location is not the canonical
working copy. Do not create a second project there.

FeedClip is a separate product and repository. Known FeedClip worktrees contain
user changes, including `/Users/macandreyshedko/projects/feedclip` and
`/Users/macandreyshedko/projects/feedclip-activity-integration`. Preserve those
changes and do not edit or clean those worktrees unless the user explicitly places
them in scope.

## Product definition

Activity is open-source activity history for React applications. It provides a
framework-independent engine, accessible React panel, headless primitives and
storage adapters while keeping credentials and data in the host application.

Current positioning:

> Open-source activity history for React. Bring your own database, or add managed
> infrastructure later.

Activity is not a legal-grade compliance archive and must not be marketed as one.
Do not invent customers, testimonials, adoption, performance results or logos.

## Decisions already made

1. Activity and FeedClip are separate products even though they share the
   `@feedclip` npm scope.
2. `feedclip.dev` remains exclusively about FeedClip. Activity must not be added as
   a FeedClip feature or major FeedClip site section.
3. GitHub Pages is the current public Activity demo. A separate Activity domain may
   be chosen later; do not use a `feedclip.dev` path by default.
4. The open-source SDK remains useful without a paid service.
5. The preferred monetization model is optional Activity Cloud plus enterprise
   operations/support, not restricting the core React component.
6. Activity Cloud may reuse private identity, billing, project, key, database and
   observability infrastructure from FeedClip Cloud, but it needs separate branding,
   onboarding, URLs, credentials, data contracts and dashboard terminology.
7. Cloud must preserve the open `StorageAdapter` model and allow complete export so
   customers are not locked in.

## Completed product work

- Published npm version `0.9.0` with provenance and public tarball smoke testing.
- 100% line, branch and function unit-test coverage for the reviewed public scope.
- 39 Playwright E2E scenarios across Chromium, Firefox and WebKit.
- Compatibility testing for Node 20/22, React 18/19, PostgreSQL 14–17 and MySQL
  8.0/8.4.
- Memory, PostgreSQL, MySQL, SQLite and HTTP adapters.
- Cursor pagination, search, filters, themes, attachments, keyboard navigation,
  localization, deep links and recoverable errors.
- `npx @feedclip/activity init` templates for React-memory and Next.js-PostgreSQL.
- Tenant-safe Next.js production starter with trusted server actors and resource
  authorization.
- Headless grouping, collapsing, retention, JSON/CSV export and subscribable feed
  primitives.
- Redaction, telemetry, bounded batch tracking and process-local idempotency helpers.
- A 100,000-row PostgreSQL read/write performance contract uploaded from CI.
- Documentation hub, troubleshooting, authentication/framework recipes, use cases,
  StackBlitz example, live configurator and product demo materials.
- Structured onboarding, Showcase and Activity Cloud Design Partner issue forms.
- Root, Next.js and StackBlitz locks refreshed after the 2026-08-08 `undici`,
  `nanoid` and `postcss` advisories.

## Activity Cloud status

Activity Cloud has been specified but has not been implemented as a standalone
managed product. The authoritative MVP plan is [`cloud-mvp.md`](cloud-mvp.md).

The first vertical slice should be:

```text
trusted server POST /v1/events
  → project/environment/tenant authorization
  → PostgreSQL through the Activity storage contract
  → short-lived resource-scoped browser read session
  → ActivityPanel GET /v1/events
```

Required before expanding scope:

- hashed, scoped and rotatable server keys;
- short-lived read-only browser tokens;
- fail-closed project/tenant/resource isolation tests;
- server-derived authoritative actors;
- durable idempotency, usage metering, quotas and retention;
- JSON/CSV export and deletion;
- latency, failure and authorization telemetry;
- three real design partners and at least one willingness-to-pay signal.

Do not start with a polished dashboard, attachments, SSO, legal hold, multiple
regions or AI features. Validate the storage/query vertical slice first.

Initial pricing research hypotheses, not public promises:

- Cloud Free: 10,000 events/month and 7-day retention;
- Cloud Pro: €29/month, 100,000 events and 90-day retention;
- Cloud Scale: €99/month, 1 million events and 365-day retention;
- Enterprise: negotiated operations, region, SLA and support.

## Growth work prepared

The executable promotion plan and ready-to-adapt copy are in
[`launch-kit.md`](launch-kit.md). It includes:

- the common product statement and primary CLI call to action;
- a 60-second video script;
- Show HN, community and social drafts;
- a design-partner outreach template;
- a four-week launch sequence;
- a weekly activation scorecard.

The primary success metric is not stars or impressions. It is whether an unfamiliar
developer records and displays a real business event without author assistance.
The integration-study protocol is [`adoption-study.md`](adoption-study.md).

## Actions only the owner can do credibly

The full checklist is [`../OWNER_ACTIONS.md`](../OWNER_ACTIONS.md). Highest priority:

1. Confirm the Activity name and whether GitHub Pages remains its public home.
2. Record the 60-second product video in the owner's voice.
3. Identify 20 relevant B2B SaaS/internal-tool prospects.
4. Send five personalized outreach messages.
5. Conduct five observed integrations with developers outside the project.
6. Record time-to-first-event, durable-storage time, blockers and production intent.
7. Obtain written approval before publishing any identity, quote, logo or result.
8. Publish and personally participate in Show HN and one suitable community launch.
9. Recruit three Activity Cloud design partners and validate volume, retention,
   security and willingness to pay.
10. Review privacy, DPA, deletion, retention, tax and invoicing obligations before
    accepting production data.

## Recommended next agent actions

1. Check `git status`, open PRs, CI and the latest npm version before changing code.
2. Ask whether the owner has completed any outreach or integration sessions; turn
   repeated evidence into onboarding/API improvements.
3. If Cloud implementation is requested, create a clean, separate worktree and start
   only with the vertical slice in `cloud-mvp.md`.
4. Reuse product-neutral platform concepts from FeedClip only after inspecting the
   current canonical FeedClip branch and preserving all existing worktree changes.
5. Keep every Cloud credential server-side and test cross-tenant/resource attacks.
6. Prefer small reviewable PRs, run proportionate verification and update this file
   when product decisions or milestone state materially change.

## Verification baseline

For SDK changes, the expected local gate is:

```bash
npm run verify
npm audit --audit-level=moderate
```

CI additionally runs database services, the Next.js starter, StackBlitz build and
the PostgreSQL performance benchmark. Release publishing is triggered by a GitHub
Release tag matching `package.json` and uses npm Trusted Publisher provenance.
