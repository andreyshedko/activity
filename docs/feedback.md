# Onboarding feedback

The core product metric is time from opening the documentation to the first
visible, persisted activity entry.

For an onboarding test, ask a developer unfamiliar with the repository to use
the production starter without live assistance. Record:

- start time;
- first successful `npm run dev`;
- first successful migration;
- first persisted status change;
- every error and documentation page opened;
- whether they can explain where actor and tenant authority come from.

Target: median time to first persisted entry below 15 minutes, with no secret in
browser code and no cross-tenant visibility.

Submit results through the
[onboarding feedback issue form](https://github.com/andreyshedko/activity/issues/new?template=onboarding.yml).
Do not include credentials or customer data.
