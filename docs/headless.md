# Headless activity primitives

Import `@feedclip/activity/headless` when the packaged panel is not the right UI.
The entrypoint has no React dependency and supplies transformations that preserve
the public `ActivityRecord` contract:

- `groupActivityByDay` groups entries with an explicit locale and time zone;
- `collapseActivityEntries` combines adjacent actor/resource/action bursts;
- `retainActivityEntries` applies deterministic before/after retention windows;
- `exportActivityEntries` produces JSON or CSV for host-controlled downloads;
- `createActivityFeed` is a subscribable store for optimistic and real-time updates.

```ts
const feed = createActivityFeed(await activity.query({ resource }));
const unsubscribe = websocket.subscribe((entry) => feed.prepend(entry));
const days = groupActivityByDay(feed.getSnapshot(), "en-US", "America/New_York");
```

The feed is transport-neutral. The host owns WebSocket, SSE or database
subscription credentials and may optimistically `prepend` a record, then `remove`
or `replace` it after the business operation settles.
