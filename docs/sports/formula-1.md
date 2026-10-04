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
| Key libs | `lib/f1-data.ts`, `f1-calendar-parse.ts`, `f1-circuits.ts`, `f1-circuit-photos.ts`, `f1-phase.ts`, `f1-guide.ts`, `f1-awards.ts`, `f1-records.ts`, `f1-types.ts` |
| Cache | Jolpica + OpenF1 via `cachedUpstreamFetch` (90s shared Data Cache). The page stays `force-dynamic` |
| Awards progress | Bar = completed Grands Prix / calendar length (not title-gap tightness). The % beside each name is a snapshot of how current points/wins split among the leaders shown if the season ended today — not betting odds. Same pattern on WC / La Liga awards. |

## Returning-user layout

Shared `SportPageShell` order (same as World Cup / Premier League / La Liga): compact rail → next event → **This Weekend** (session schedule — never labeled “Matches”) → news/facts → championship standings → How F1 Works → **Track Profiles** carousel (opens centred on the current/next GP) → awards → records.

The next-session card uses three paragraphs (`featuredF1EventParagraphs`): what the session is (with commentator-style track colour plus Jolpica win history via `getCircuitTrackFact`), a paddock/form-book read from the standings, and how the result hits the drivers. No betting odds and no invented expert quotes. The country mark is a regional-indicator flag emoji from the circuit's ISO code (`lib/f1-circuits.ts`), with a short text badge only when that code is missing. On large screens an illustrated aerial at `public/venues/f1/<slug>.webp` (1600×1067) fills the right half of the card; on narrow screens it sits under the text. The art is not a photograph, and Formula 1 does not request a Wikimedia image.

Calendar identity follows the circuit. Jolpica's 2026 round 16 stores `raceName` "Bahrain Grand Prix in Malaysia" on the Sepang / Malaysia record, and OpenF1 meeting 1308 still has `country_code` BRN for a Kuala Lumpur location. `normalizeCalendarRace` keeps the circuit country and replaces a race name that also names a different country, so the title, circuit, country, date, and flag describe the same place. OpenF1 sessions are matched to that Grand Prix's weekend only, and their country is not copied onto the round.

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
