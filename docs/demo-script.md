# Demo and recording script

Use the [live demo](https://andreyshedko.github.io/activity/) for product reviews,
release screenshots and a short walkthrough. It runs the real `ActivityPanel`
against the same public contracts documented for package users.

## 60-second walkthrough

1. Open an invoice and explain that Activity embeds resource history inside an
   existing product rather than replacing the product's domain model.
2. In the configurator, switch density, locale and accent color. Copy the generated
   JSX to show that the preview maps directly to public props and CSS variables.
3. Search for an actor, apply an action filter and open an entry with the keyboard.
4. Enable developer details to show record metadata and changes.
5. Track a new update in the demo composer and show it appear in the same panel.
6. Switch to the error state and retry to demonstrate the recoverable UI contract.
7. Finish on the production starter: authentication, authorization and storage stay
   in the host application; Activity supplies the engine, adapters and React UI.

## Capture checklist

- Use a 1440×900 or larger viewport and hide browser bookmarks or personal data.
- Record the default light theme first; show dark or branded styling as a deliberate
  customization step.
- Keep the package version and demo URL visible in the description.
- Do not describe Activity as a compliance archive or claim customer adoption
  without evidence and permission.
- Re-record after a breaking UI change; refresh the repository screenshot whenever
  the configurator or primary demo layout changes.

The current repository screenshot is
[`assets/activity-configurator.png`](assets/activity-configurator.png).
