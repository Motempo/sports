# Feedback & Linear

## Contract

User reports live in Linear team **MOT** through `@motempo/feedback`. This app submits with an explicit `appId` (`sports`). `LINEAR_TEAM_NAME` is the team name `motempo` (key MOT).

```json
{
  "appId": "sports",
  "description": "…",
  "pageUrl": "https://sports.motempo.com/…",
  "feedbackCategory": "general",
  "screenshotBase64": "…"
}
```

| Layer | Requirement |
|-------|-------------|
| Client | Prefer `NEXT_PUBLIC_MOTEMPO_APP_ID`; hostname is fallback |
| API | `app/api/feedback/route.ts` |
| Linear title | Prefer `[sports] …` prefix pattern |
| Body | Include **App:** sports context |
| Categories | `general` \| `sport-request` |

## Endpoints

| Route | Role |
|-------|------|
| `POST /api/feedback` | Create issue (+ optional screenshot). 10/IP/hour. 500s are generic |
| `GET/POST /api/feedback/improve` | Grok rewrite availability / improve. POST allows 5/IP/hour and 20/IP/day, caps text at 8 KB, and checks both before xAI |

`POST /api/feedback` stays unauthenticated and rate-limited. The app does not expose routes to list, close, or reopen Linear issues.

Libs: `lib/linear-issues.ts`, `lib/feedback-context.ts`, `lib/feedback-improve.ts`, `lib/rate-limit.ts`, `lib/screenshot-mime.ts`.

`POST /api/feedback` is limited to **10 requests per client IP per hour** (in-memory, per instance). `POST /api/feedback/improve` is limited to **5 per hour and 20 per day**. Improve also rejects feedback text over **8 KB** (8192 UTF-8 bytes) before any model call. The key is the Vercel client IP: rightmost hop of `x-vercel-forwarded-for`, otherwise `x-real-ip`. The first `x-forwarded-for` hop is ignored so a caller cannot rotate buckets by spoofing that header.

Improve reads `XAI_API_KEY_SPORTS_FEEDBACK`, then `GROK_API_KEY`, then `XAI_API_KEY`. It calls `grok-3-mini` first and uses `grok-4.3` (`reasoning_effort: none`) only when that call fails. Venue resolution in `lib/grok.ts` uses the same two-model order and does not read the feedback-only key.

`@motempo/feedback` 0.2.0 describes this Improve policy. This app does not depend on that package: it is published to GitHub Packages as a private package, and CI installs from the public npm registry with no package token. The route in `app/api/feedback/improve/route.ts` and `lib/feedback-improve.ts` implement the same limits locally.

Screenshot `contentType` must be an allowlisted image type (PNG, JPEG, WebP, GIF, AVIF, HEIC, HEIF, BMP, TIFF). Other client-supplied MIME types are rejected with 400 and are not sent to Linear.

Upstream Linear error text is logged server-side. The public submit route answers 500 with `Failed to submit feedback.`

## UX

Port of Motempo Ads feedback flow — see skill `~/.cursor/skills/motempo-feedback/SKILL.md`. Components under `components/feedback/`.

## User reports

`oo.motempo.com` is retired. User reports live in Linear team **MOT** through `@motempo/feedback`.

This app creates those issues with public `POST /api/feedback`. Historical ops-loop plan: `~/.cursor/plans/motempo_ops_loop_ee5f146b.plan.md`.

## History

Originally GitHub Issues in Motempo/sports; migrated to Linear for multi-app intake.
