# Security

## Reporting

Report suspected vulnerabilities privately through GitHub Security Advisories for
`andreyshedko/activity`. Do not include secrets, personal data, or live signed URLs
in a public issue.

## Activity data

Activity stores the values supplied by the host application. Applications are
responsible for data classification, authorization before querying a resource,
retention/deletion policies, and redacting secrets or unnecessary personal data
before calling `track()`.

Never store access tokens, session cookies, payment credentials, raw request
headers, or permanent signed download URLs in content or metadata.

## Attachments

Activity stores attachment metadata; it does not upload, proxy, scan, authorize,
or serve files. Attachment URLs accept root-relative paths or approved absolute
protocols. HTTPS is the only absolute protocol allowed by default.

Use `attachmentPolicy` to enforce application limits for size, MIME type, and URL
protocol. MIME values and file extensions are descriptive metadata and must not be
trusted for malware detection. Generate short-lived download authorization in the
host application's `onAttachmentOpen` handler.

`ActivityPanel` never navigates to an attachment URL automatically. It delegates
opening to `onAttachmentOpen`, so the host application can reauthorize access and
create a fresh signed URL.

## Database access

The PostgreSQL adapter assumes the provided client has access only to the Activity
tables required by the application. Use TLS, least-privilege credentials, database
backups, and application-level authorization before exposing query results.
