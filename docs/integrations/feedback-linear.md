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
| `POST /api/feedback` | Create issue (+ optional screenshot markdown) |
| `GET/POST /api/feedback/improve` | Grok rewrite availability / improve |
| `GET /api/feedback/recent` | Ops list (no auth) |
| `POST /api/feedback/close-shipped` | Close fixed tickets (no auth; used by oo/deploy) |
| `POST /api/feedback/reopen` | Reopen (no auth) |

Libs: `lib/linear-issues.ts`, `lib/feedback-context.ts`, `lib/rate-limit.ts` (10/IP/hr).

## UX

Port of Motempo Ads feedback flow — see skill `~/.cursor/skills/motempo-feedback/SKILL.md`. Components under `components/feedback/`.

## Downstream: oo

`oo.motempo.com` (folder `oo/`): coordinator triages Linear → plan agents → human approve → implement agents → Vercel deploy → `close-shipped`.  
Plan: `~/.cursor/plans/motempo_ops_loop_ee5f146b.plan.md`.

## History

Originally GitHub Issues in Motempo/sports; migrated to Linear for multi-app intake.
