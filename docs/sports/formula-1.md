# Formula 1

**Slug:** `formula-1` · **Route:** `/formula-1` · **Homepage:** yes (`CURRENT_SPORT_SLUG`)  
**Plan source:** `~/.cursor/plans/formula_one_page_b600a36e.plan.md`  
**Linear:** MOT-6 (add F1 page)

## Product intent

Family-friendly F1 companion mirroring World Cup IA: where we are in the season, who's leading, when to watch, how F1 works — no betting, no telemetry dashboards.

## WC → F1 mapping

| World Cup | F1 |
|-----------|-----|
| TournamentRail | SeasonRail |
| Group standings | Drivers / Constructors championship |
| Third-place tracker | Title fight tracker |
| ScheduleByDay | Weekend sessions (FP/Quali/Sprint/Race) |
| Knockout bracket | Season calendar |
| RulesPrimer | How F1 Works |

## Data

| Layer | Detail |
|-------|--------|
| Primary | Jolpica Ergast `https://api.jolpi.ca/ergast/f1` |
| Supplement | OpenF1 sessions (`date_start`, `date_end`, `is_cancelled`) |
| Seed | `data/f1-season-seed.json`, constructor colors, profile meta |
| Env | `F1_SEASON` (defaults to calendar year) |
| Key libs | `lib/f1-data.ts`, `f1-phase.ts`, `f1-guide.ts`, `f1-awards.ts`, `f1-records.ts`, `f1-types.ts` |
| Cache | Jolpica + OpenF1 via `cachedUpstreamFetch` (90s shared Data Cache). The page stays `force-dynamic` |
| Awards progress | Bar = completed Grands Prix / calendar length (not title-gap tightness). The % beside each name is a snapshot of how current points/wins split among the leaders shown if the season ended today — not betting odds. Same pattern on WC / La Liga awards. |

## Returning-user layout

Shared `SportPageShell` order (same as World Cup / Premier League / La Liga): compact rail → next event → **This Weekend** (session schedule — never labeled “Matches”) → news/facts → championship standings → How F1 Works → **Track Profiles** carousel (opens centred on the current/next GP) → awards → records.

The next-session card uses three paragraphs (`featuredF1EventParagraphs`): what the session is (with commentator-style track colour plus Jolpica win history via `getCircuitTrackFact`), a paddock/form-book read from the standings, and how the result hits the drivers. No betting odds and no invented expert quotes. On large screens a Wikimedia **oblique aerial** of the circuit (from the air at ~45°, not a flat layout map) fills the right half of the card, cropped so the track sits in the centre of the photo well; on narrow screens it sits under the text.

Do **not** overload `MatchInfo` for F1 — use F1-specific types.

## Session live badge

Jolpica publishes a start time and no end. `inferSessionStatus` in `lib/f1-session-status.ts` (called from `lib/f1-data.ts`) keeps the live badge for the scheduled length plus a 15-minute buffer:

| Session | Scheduled length | Live until |
|---------|------------------|------------|
| Practice | 60 min (FIA B2.1) | start + 75 min |
| Sprint qualifying | ~45 min (12+7+10+7+8, B2.2) | start + 60 min |
| Qualifying | 60 min (18+7+15+7+13, B2.4) | start + 75 min |
| Sprint | ~30–45 min (100 km, B2.3) | start + 60 min |
| Race | up to 2 h (B2.5) | start + 135 min |

When OpenF1 (or another source already fetched) has a real `date_end`, that end replaces the estimate, with 5 minutes of grace for clock skew. An explicit `finished` or `cancelled` status from that source wins over the estimate, including a race that ends early. A stale `live` flag does not. A session that ended an hour ago shows as finished.

A red-flagged race can run to 3 hours, and FP is sometimes extended to 90 minutes. Those stay live only when the fetched end time says so. The seed fallback recomputes the same windows, so a stale `"scheduled"` snapshot does not leave a finished session looking live.
