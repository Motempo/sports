# Premier League

**Slug:** `premier-league` · **Route:** `/premier-league`  
**Origin:** Aug 2026 request — “World Cup replica adapted for league table”  
**Chat:** agent transcript `554aa49f-e1bc-4bb8-aff1-d5965d9eee7f`

## Product intent

Same shell as World Cup / F1, but competitive centerpiece is the **league table** (not knockouts): European qualification + relegation zones, fixtures/results, season races, how PL works, news, fun facts, awards, records.

## Decisions (from questionnaire)

- Always show the **calendar current** season (`2026/27` from August 2026); never stay on last year’s fixtures because a mirror lagged
- Full shell in nav next to F1 / World Cup

## Data

| Layer | Detail |
|-------|--------|
| Live | football-data.org `PL` (when key has access + same season) and ESPN `eng.1` scoreboard (calendar-year merge) |
| Mirror | openfootball `en.1.json`, else `england/{season}/1-premierleague.txt` for the **current** season (`2026-27`, …) |
| Seed | `data/pl-clubs-seed.json` (2026/27 clubs) + short matchday grid when mirrors lag |
| Selection | Parallel fetch; pick the board with the **most finished fixtures** (ties: api → espn → openfootball) |
| Standings | `lib/league-standings.ts` — zones 1–4 CL, 5 EL, 6 ECL, 18–20 relegated. Header matchday is the highest real round with a finished game (`lib/league-matchdays.ts`) |
| Key libs | `lib/premier-league-data.ts`, `league-data-cascade.ts`, `espn-league-data.ts`, `*-phase.ts`, `*-guide.ts`, `*-awards.ts`, `*-records.ts`, `*-types.ts` |

## UI

- Shared `SportPageShell` + featured next-match card (description / form-book / player impact)
- Stadium photo is the next match's home ground: same-origin aerial at `public/venues/football/<slug>.webp`, mapped in `data/football-venue-photos.json`
- `PremierLeagueRail`, `LeagueTable`, `RaceTracker`
- `HowPremierLeagueWorks`, awards + **season & all-time records** (World Cup-style two-mark cards)
- Shared `ScheduleByDay` with `stage: "LEAGUE"` / matchday in `group`
- League table refreshes on open via `router.refresh()`, then every 3 minutes. Upstream football-data / ESPN / openfootball responses are shared for 90 seconds (`cachedUpstreamFetch`); a 429 is not stored and still falls through to the next source
- Finished fixtures in Matches open a next-match-style detail modal
- Ads: `PremierLeagueAdPlacements`

## Status

Near feature-complete relative to F1/WC richness. Reference implementation for other club leagues.
