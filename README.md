# thaan.ai

AI-assisted fabric defect grading for mills and traders, using ASTM D5430 4-point grading plus 10-point and custom buyer standards.

## Quick start

```bash
npm install
copy .env.example .env
npm run dev:all
```

Open `http://localhost:5173`. Enable **Demo Mode** for bundled sample results. Demo/fallback results are clearly marked and must not be used for production quality decisions.

For live vision analysis, set `ANTHROPIC_API_KEY` or `GEMINI_API_KEY`. Set a long random `SIGNING_SECRET` for certificate signing. Local development uses a warned development-only signing secret when this variable is absent; production refuses to use that fallback.

## Environment

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude vision provider |
| `GEMINI_API_KEY` | Gemini vision provider alternative |
| `VISION_MODEL` | Provider model name |
| `SIGNING_SECRET` | Server-only HMAC-SHA256 certificate secret; required in production |
| `PORT` | Express port, default `3001` |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins |
| `TRUST_PROXY` | Set `true` only behind a trusted reverse proxy |
| `VITE_API_BASE_URL` | API origin when frontend/backend deploy separately |

## Trust model

The browser keeps a SHA-256 image hash for cache/content identity. It is not proof of authenticity. When a report is saved, Express signs a canonical report payload with HMAC-SHA256 using `SIGNING_SECRET`. Verification sends the payload and signature back to Express, which compares signatures with a constant-time comparison.

Share links contain only a short server-side share ID. The server keeps the signed payload in memory for the process lifetime; replace this with Redis/Postgres for multi-instance production use.

## Deployment

This repository uses a stateful, long-running Express backend. Deploy the backend to Railway, Render, Fly.io, or another Node host and configure its environment variables. Deploy the Vite `dist/` output to Vercel or another static host with `VITE_API_BASE_URL` set to the backend URL. Configure `ALLOWED_ORIGINS` on the backend to the static frontend origin.

Do not deploy `server.js` as a Vercel serverless function without replacing its in-memory cache, rate limiter, and share store with shared storage.

## Commands

```bash
npm test
npm run build
npm run dev:all
```

The test suite covers the ASTM grading engine, rejection explanations, fallback provenance, image validation, HMAC signing, tamper detection, and compact share verification.

`public/samples/` contains four bundled JPEG samples for Demo Mode: woven stain/float, denim slub/broken end, shirting weft bar, and knit hole/crease.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the detect -> grade -> certify -> verify pipeline.
