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
| Seed | `data/wc2026-*.json`, `data/team-seed.json`, `team-iso-map.json` |
| Key libs | `lib/football-data.ts`, `lib/knockout-enrich.ts`, `lib/group-standings.ts`, `lib/tournament-phase.ts`, `lib/match-forecast.ts`, `lib/match-venue.ts` |

## UI map

| Section | Components / notes |
|---------|-------------------|
| Rail | `TournamentRail` (compact) |
| Next event | `FeaturedMatchCard` |
| Schedule | `ScheduleByDay` — finished games open a next-match-style detail modal |
| Widgets | News + Fun facts (`sportSlug="world-cup"`) |
| Groups / standings | Group grids + third-place tracker (group stage) |
| Knockout | `BracketTree` during knockouts |
| Primer | `RulesPrimer` / tournament guide |
| Awards / records | `world-cup-awards.ts`, `world-cup-records.ts` |

## Requirements highlights

- Zoom-dependent bracket card detail (flags → score/time → venue → commentary)
- Deterministic forecast copy from FIFA rank / confederation / rivalry (`match-forecast.ts`) — not ML
- Next-match card body is three paragraphs: event description, form-book prediction, player impact (`featured-match-copy.ts`)
- Venue enrichment prefers seed/API over Grok by default
- Family-friendly; no official FIFA logo assets
