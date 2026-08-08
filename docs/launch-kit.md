# Activity launch kit

Use one product statement consistently:

> Open-source activity history for React. Bring your own database, or add managed
> infrastructure later.

Primary call to action:

```bash
npx @feedclip/activity init . --template react-memory
```

Secondary proof: [live demo](https://andreyshedko.github.io/activity/),
[production starter](../examples/nextjs/README.md), 100% tested public contracts,
React 18/19 and PostgreSQL/MySQL/SQLite adapters.

## 60-second launch video

1. Show an existing invoice page without history.
2. Run the init command and render `ActivityHistory`.
3. Track a status change and show it appear.
4. Search, filter and open the entry with the keyboard.
5. Change locale, density and accent in the configurator.
6. End on: “MIT SDK, your database, optional managed cloud later.”

Do not call Activity a compliance archive or claim adoption that has not been
approved by a real user.

## Show HN draft

**Title:** Show HN: Activity – open-source activity history for React

**Post:**

> I kept rebuilding the same invoice/order/ticket history UI in SaaS products, so
> I extracted it into Activity. It provides a framework-independent engine, an
> accessible React panel, cursor pagination and adapters for PostgreSQL, MySQL,
> SQLite, memory and HTTP. Data and credentials stay in your application.
>
> You can try the UI without infrastructure or generate a starter with
> `npx @feedclip/activity init`. I am looking for developers with a real resource
> history use case and especially want feedback on time-to-first-event and the
> server authorization boundary.

## Reddit / community draft

> I built an MIT-licensed activity-history component for React apps after seeing
> the same feature repeatedly implemented for invoices, tickets and admin tools.
> It includes search, filters, keyboard navigation, themes, attachments, cursor
> pagination and self-hosted database adapters. There is no required cloud account.
> I would value blunt feedback from anyone who has built this in-house: what would
> prevent you from using it in production?

Use this only in communities where project showcases are allowed. Participate in
the discussion and do not repost identical copy across multiple communities.

## LinkedIn / X / Bluesky draft

> Released Activity 0.9: open-source activity history for React applications.
> Bring PostgreSQL, MySQL or SQLite; keep credentials on your server; use the
> packaged UI or headless primitives. The new CLI creates a working integration:
> `npx @feedclip/activity init`. Demo: https://andreyshedko.github.io/activity/

## Design-partner outreach

**Subject:** Free implementation help for your product history UI

> I am developing Activity, an open-source React component and storage engine for
> invoice, order, ticket and customer history. I noticed that your product has a
> resource-detail workflow where history may be useful. I can help integrate it in
> a test branch at no cost. In return I want to observe where installation is
> confusing and measure time to the first real event. There is no requirement to
> use a hosted service or publish your company name.

Follow up once after five business days. Stop if the recipient is not interested.

## Four-week execution

### Week 1 — proof and list

- Record the 60-second video and add it to the release post.
- Build a list of 20 relevant B2B SaaS or internal-tool teams.
- Send five personalized design-partner messages.
- Publish one technical article about a tenant-safe activity history.

### Week 2 — integrations

- Conduct the first five observed integrations using the
  [study kit](adoption-study.md).
- Fix every repeated onboarding blocker before adding optional features.
- Ask successful users for permission to quote measured outcomes.

### Week 3 — developer launch

- Publish Show HN and one suitable React/Next.js community post.
- Answer every substantive issue and discussion.
- Submit the project to relevant curated open-source lists.

### Week 4 — evidence and offer

- Publish the first approved case study.
- Offer paid production setup and architecture review.
- Invite three qualified users to the Activity Cloud design-partner program.
- Decide whether Cloud solves a repeated operational burden users will pay for.

## Weekly scorecard

Track outcomes, not only stars:

| Metric | Weekly target before broad launch |
|---|---:|
| Personalized outreach | 5 |
| Observed integrations | 1–2 |
| Median time to first real event | under 15 minutes |
| Unresolved onboarding blockers | 0 repeated blockers |
| Production-intent teams | 3 total |
| Cloud design partners | 3 total |
| Teams willing to pay | at least 1 before expanding Cloud scope |

GitHub stars, impressions and npm downloads are supporting indicators. The core
activation event is a real host application successfully recording and displaying
its first business event.

Use the repository's **Activity showcase** issue form for approved public examples
and **Activity Cloud design partner** form for managed-service research.
