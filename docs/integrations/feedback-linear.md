# Feedback & Linear

## Contract

Every Motempo app posts feedback to the **same Linear team** (`LINEAR_TEAM_NAME=motempo`) with an **explicit `appId`**.

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
| `GET/POST /api/feedback/improve` | Grok rewrite availability / improve. POST is the same 10/IP/hour limit, checked before xAI |

`POST /api/feedback` stays unauthenticated and rate-limited. The app does not expose routes to list, close, or reopen Linear issues.

Libs: `lib/linear-issues.ts`, `lib/feedback-context.ts`, `lib/rate-limit.ts`, `lib/screenshot-mime.ts`.

`POST /api/feedback` and `POST /api/feedback/improve` are each limited to **10 requests per client IP per hour** (in-memory, per instance). The key is the Vercel client IP: rightmost hop of `x-vercel-forwarded-for`, otherwise `x-real-ip`. The first `x-forwarded-for` hop is ignored so a caller cannot rotate buckets by spoofing that header.

Screenshot `contentType` must be an allowlisted image type (PNG, JPEG, WebP, GIF, AVIF, HEIC, HEIF, BMP, TIFF). Other client-supplied MIME types are rejected with 400 and are not sent to Linear.

Upstream Linear error text is logged server-side. The public submit route answers 500 with `Failed to submit feedback.`

## UX

Port of Motempo Ads feedback flow — see skill `~/.cursor/skills/motempo-feedback/SKILL.md`. Components under `components/feedback/`.

## Downstream: oo

`oo` was the only caller of the removed list, close, and reopen routes. It is being deleted. Feedback still lands in the shared Linear team through `POST /api/feedback`. Historical plan: `~/.cursor/plans/motempo_ops_loop_ee5f146b.plan.md`.

## History

Originally GitHub Issues in Motempo/sports; migrated to Linear for multi-app intake.
