# Activity documentation

Activity adds searchable, accessible resource history to React SaaS products
while keeping credentials and data in the host application.

## Start here

| Goal | Guide |
|---|---|
| Evaluate the UI without infrastructure | [Five-minute quick start](../README.md#five-minute-quick-start) |
| Build a production Next.js integration | [Next.js + PostgreSQL starter](../examples/nextjs/README.md) |
| Connect authentication and tenants | [Authentication recipes](authentication.md) |
| Use another server framework | [Framework recipes](frameworks.md) |
| Diagnose an integration | [Troubleshooting](troubleshooting.md) |
| Customize the React panel | [React customization](customization.md) |
| Validate scale and latency | [Performance](performance.md) |
| Choose the right use case | [Use cases and comparison](use-cases.md) |
| Report onboarding results | [Feedback](feedback.md) |

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

Documentation bugs are product bugs. Use the
[onboarding feedback form](https://github.com/andreyshedko/activity/issues/new?template=onboarding.yml)
when a documented path is incomplete, unclear, or does not run as written.
