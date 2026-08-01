# Commercial packaging options

The open-source product remains useful without a hosted service: engine, storage
contracts, database adapters, HTTP boundary, React UI and headless primitives.

Potential paid layers should solve operational problems rather than withholding the
basic activity history:

| Layer | Candidate value |
|---|---|
| Pro components | advanced diff renderers, policy-aware exports and admin tooling |
| Managed Activity Cloud | storage, retention jobs, delivery, backups and usage visibility |
| Enterprise | SSO/RBAC integration support, legal holds, regional deployment and SLAs |

Do not couple the SDK to FeedClip Cloud credentials. Hosted functionality should use
the same documented adapter and HTTP contracts so customers can migrate in either
direction. Pricing should be chosen only after integration studies show which
operational burden users will pay to remove.
