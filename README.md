# GST Bill Maker — PDF Renderer

Headless Chromium serverless function. Receives invoice HTML, returns a vector PDF rendered by real Chrome — output is byte-identical to what the browser's Print → Save-as-PDF produces. Deploys to Vercel free tier.

## What it does

`POST /api/render` with JSON body:

```json
{
  "html": "<!DOCTYPE html><html>...invoice HTML...</html>",
  "filename": "invoice-TIRCO-2026-020.pdf",
  "options": {
    "format": "A4",
    "margin": { "top": "10mm", "right": "10mm", "bottom": "10mm", "left": "10mm" },
    "preferCSSPageSize": true
  }
}
```

Returns the PDF binary as `application/pdf`.

## Headers

- `Content-Type: application/json`
- `X-Auth-Token: <your-shared-token>` (must match `SHARED_TOKEN` env var on Vercel)

## Environment variables (set in Vercel project settings)

- `SHARED_TOKEN` — required. A long random string. Same value used in WordPress Snippet 70 to authenticate.
- `ALLOW_ORIGIN` — optional. Defaults to `*`. Set to `https://gstbillmaker.in` after testing for stricter CORS.

## Deployment

1. Push this repo to GitHub.
2. On Vercel: New Project → Import this repo → Deploy.
3. After first deploy: Settings → Environment Variables → add `SHARED_TOKEN` (any long random string) → redeploy.
