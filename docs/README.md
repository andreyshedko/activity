# Activity documentation

Activity adds searchable, accessible resource history to React SaaS products
while keeping credentials and data in the host application.

## Start here

Current maintainers and future agents should begin with the
[project handoff](PROJECT_HANDOFF.md) before planning new product work.

| Goal | Guide |
|---|---|
| Generate integration files | `npx @feedclip/activity init` |
| Evaluate the UI without infrastructure | [Five-minute quick start](../README.md#five-minute-quick-start) |
| Build a production Next.js integration | [Next.js + PostgreSQL starter](../examples/nextjs/README.md) |
| Connect authentication and tenants | [Authentication recipes](authentication.md) |
| Use another server framework | [Framework recipes](frameworks.md) |
| Diagnose an integration | [Troubleshooting](troubleshooting.md) |
| Customize the React panel | [React customization](customization.md) |
| Build a custom UI or real-time feed | [Headless primitives](headless.md) |
| Add redaction, telemetry and batch tracking | [Reliability and operations](reliability.md) |
| Validate scale and latency | [Performance](performance.md) |
| Choose the right use case | [Use cases and comparison](use-cases.md) |
| Present or record the product | [Demo and recording script](demo-script.md) |
| Report onboarding results | [Feedback](feedback.md) |
| Run measured integrations | [Integration study kit](adoption-study.md) |
| Evaluate sustainable packaging | [Commercial options](commercial-options.md) |
| Define the managed product boundary | [Activity Cloud MVP](cloud-mvp.md) |
| Prepare developer launch and outreach | [Launch kit](launch-kit.md) |

## Integration model

```text
Browser
  ActivityPanel → httpAdapter → authenticated server endpoint
                                      ↓
Business operation → trusted track() → tenant boundary → storage adapter → database
```

The browser may request activity for a resource it is authorized to view. It
must not choose the tenant or authoritative actor, and production applications
should record events from trusted server code after the business operation is
accepted.

## API and operations

- [Public API stability](../API_STABILITY.md)
- [Compatibility matrix](../COMPATIBILITY.md)
- [Database migrations](../MIGRATIONS.md)
- [Security policy](../SECURITY.md)
- [Changelog](../CHANGELOG.md)
- [Owner actions](../OWNER_ACTIONS.md)

Documentation bugs are product bugs. Use the
[onboarding feedback form](https://github.com/andreyshedko/activity/issues/new?template=onboarding.yml)
when a documented path is incomplete, unclear, or does not run as written.
