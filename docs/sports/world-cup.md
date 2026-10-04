# World Cup 2026

**Slug:** `world-cup` · **Route:** `/world-cup`  
**Plan source:** `~/.cursor/plans/world_cup_tracker_app_6d7bbc04.plan.md`  
**Founding chat:** agent transcript `338c2575-2ffd-4b10-8aff-513c9e303bfa`

## Product intent

Track FIFA World Cup 2026 (USA · Canada · Mexico) with the shared returning-user shell: next match, schedule, news/facts, then standings or knockout.

## Data

| Layer | Detail |
|-------|--------|
| Primary | football-data.org competition `WC` |
| Mirror | openfootball worldcup JSON |
| Seed | `data/wc2026-*.json`, `data/team-seed.json`, `team-iso-map.json` — fixture grid only |
| Key libs | `lib/football-data.ts`, `lib/knockout-enrich.ts`, `lib/group-standings.ts`, `lib/tournament-phase.ts`, `lib/match-forecast.ts`, `lib/match-venue.ts` |
| Cache | football-data and openfootball via `cachedUpstreamFetch` (90s). Page stays `force-dynamic` |

## UI map

| Section | Components / notes |
|---------|-------------------|
| Rail | `TournamentRail` (compact) |
| Next event | `FeaturedMatchCard`. Stadium photo comes from `data/football-venue-photos.json` (same-origin Commons file, credit line on the image) |
| Schedule | `ScheduleByDay` — finished games open a next-match-style detail modal |
| Widgets | News + Fun facts (`sportSlug="world-cup"`) |
| Groups / standings | Group grids + third-place tracker (group stage) |
| Knockout | `BracketTree` during knockouts |
| Primer | `RulesPrimer` / tournament guide |
| Awards / records | `world-cup-awards.ts`, `world-cup-records.ts` |

## Seed fallback

When football-data.org and openfootball both fail, `generateSeedGroupMatches` returns the group fixture grid as `SCHEDULED` with null scores. Past kickoffs are not marked `FINISHED`, and the seed does not invent scorelines. Standings from that payload show 0 played. The World Cup page states that live data is unavailable and does not paint those tables as qualification results.

## Requirements highlights

- Zoom-dependent bracket card detail (flags → score/time → venue → commentary)
- Deterministic forecast copy from FIFA rank / confederation / rivalry (`match-forecast.ts`) — not ML
- Next-match card body is three paragraphs: event description, form-book prediction, player impact (`featured-match-copy.ts`)
- Venue enrichment uses local group/knockout fixtures and `data/wc2026-stadiums.json` first (FIFA host-stadium names included). football-data TLAs that differ from those fixtures (`KSA`, `HTI`, and the other codes in `lib/wc-team-codes.ts`) are normalized before the lookup
- One `/world-cup` render does the competition-matches request plus at most 4 `GET /v4/matches/{id}` calls, and only for fixtures that are still missing a venue. Those detail calls stay on `uncachedFetch` because client cards import `lib/match-venue.ts`. A miss is not retried on that isolate for 10 minutes. A missing venue is left blank
- Grok venue fill stays off on the page render (`useGrok: false`)
- Family-friendly; no official FIFA logo assets
