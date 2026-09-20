# thaan.ai Architecture

```mermaid
flowchart LR
  A[Upload fabric image] --> B[SHA-256 content hash]
  B --> C[/api/detect]
  C --> D[Claude or Gemini]
  C --> E[Explicit fallback/demo result]
  D --> F[Detection metadata + defects]
  E --> F
  F --> G[Deterministic ASTM grading engine]
  G --> H[Report payload]
  H --> I[/api/sign HMAC-SHA256]
  I --> J[Local history + share ID]
  J --> K[/api/verify constant-time comparison]
```

## Boundaries

- `src/api/detect.ts` distinguishes `source: "ai"` from `source: "fallback"`.
- `src/engine/grading.ts` is pure deterministic business logic and remains independent of AI providers.
- `server.js` owns provider keys, image validation, rate limiting, HMAC signing, verification, and share records.
- `src/utils/crypto.ts` provides client content hashing only; the browser no longer creates certificate authenticity signatures.
- `src/utils/history.ts` stores recent reports locally for the hackathon demo.

## Integrity

The signed payload includes report identity, image hash, grading settings, detection output, grading result, audit trail, and provenance. A changed payload produces a different server-side HMAC. This proves integrity relative to the configured thaan.ai signing secret; it is not a public-key signature or independent third-party attestation.

## Scaling note

Detection cache, rate-limit windows, and share records are currently in-memory for a self-contained hackathon build. Replace those maps with a shared store before running multiple backend instances or requiring durable share links.