# Security Policy

## Reporting a Vulnerability

Please **do not** open a public issue for security problems. Instead use GitHub's
private reporting: **Security → Report a vulnerability** on this repository
(GitHub Security Advisories). You will get an acknowledgement within a few days
and a fix or mitigation plan before any public disclosure.

## Supported versions

Only the latest release / `main` is supported with security fixes.

## Security posture (what this plugin does and does not do)

- **Browser-only.** The plugin ships **no server-side code**: no API handlers,
  no tools, no lifecycle hooks, no subprocesses, no file or settings writes.
  Its entire runtime is a `sidebar-end` webui extension executing in the chat
  page.
- **CDN dependency.** The renderer imports `mermaid@11` from jsDelivr at page
  load (`cdn.jsdelivr.net`). If the CDN is unreachable, diagrams simply stay as
  plain code blocks. If you operate in a supply-chain-sensitive environment,
  restrict or pin that origin at your proxy.
- **Rendering untrusted input.** Diagram source comes from chat content and is
  rendered with `securityLevel: 'loose'` (required for interactive SVGs).
  Mermaid's own sanitizer plus Agent Zero's DOMPurify-based markdown pipeline
  sit in front of it. The source shown in the toggle/error views is
  HTML-escaped before injection.
- **No data exfiltration surface.** The plugin makes no network calls other
  than the mermaid library import; clipboard access happens only on explicit
  user action (the copy button).

## Secrets

The repository must never contain credentials. The CI static validator scans
for common secret patterns on every run, and the test suite fails the build on
findings.
