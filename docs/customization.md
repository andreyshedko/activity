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
.invoice-activity .activity-panel {
  --activity-color-accent: #2563eb;
}
```

Use the [live configurator](https://andreyshedko.github.io/activity/) to choose
theme, density, locale and accent, preview the result, and copy generated JSX/CSS.
The same demo exercises search, filters, loading/empty/error states, keyboard
navigation, attachments and entry expansion.
