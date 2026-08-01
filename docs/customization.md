# React customization

Start with the default panel and change only what the host product needs:

```tsx
<ActivityPanel
  activity={activity}
  resource={resource}
  theme="system"
  variant="default"
  locale="en-US"
  pageSize={20}
/>
```

The panel supports light, dark and system themes, compact/default/comfortable
density, localized messages, custom empty/error renderers, attachment handling,
custom entry actions and controlled deep-link expansion.

Import the package stylesheet once and override documented variables at the host
boundary:

```css
.invoice-activity {
  --activity-accent: #2563eb;
  --activity-radius: 10px;
}
```

Use the [live demo](https://andreyshedko.github.io/activity/) to exercise themes,
search, filters, loading/empty/error states, keyboard navigation, attachments and
entry expansion. The interactive copy/paste configurator is tracked as the next
demo improvement; until then, keep overrides close to the documented CSS custom
properties rather than internal class names.
