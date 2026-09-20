# La Liga

**Slug:** `la-liga` · **Route:** `/la-liga`  
**Origin:** Aug 2026 — World Cup-style replica for La Liga  
**Chat:** agent transcript `c3033cb7-9efb-490e-87dc-7a2bdc715740`

## Product intent

Same league-table companion pattern as Premier League for Spain’s top flight: table with European/relegation zones, fixtures, season rail, how it works, news, fun facts.

## Data

| Layer | Detail |
|-------|--------|
| Live | football-data.org `PD` (when key has access + same season) and ESPN `esp.1` scoreboard |
| Mirror | openfootball `es.1.json`, else `espana/{season}/1-liga.txt` for the **current** season |
| Seed | `data/la-liga-clubs-seed.json` (2026/27 clubs) + current-season preview grid when mirrors lag |
| Selection | Same freshest-finished-match cascade as Premier League (`lib/league-data-cascade.ts`) |
| Standings | Reuses `lib/league-standings.ts` + PL zone helper |
| Key libs | `la-liga-data.ts`, `espn-league-data.ts`, `la-liga-phase.ts`, `la-liga-guide.ts`, `la-liga-types.ts` |

## UI

- Shared `SportPageShell` + featured next-match card (description / form-book / player impact)
- League table refetches live ESPN/API data when the page opens
- Finished fixtures in Matches open a next-match-style detail modal
- `LaLigaSeasonRail`, reuses PL `LeagueTable` + `RaceTracker`
- `HowLaLigaWorks`, news/facts, ads, OG image

## Known parity gaps vs Premier League

| Gap | Notes |
|-----|-------|
| No awards module/section | PL has Golden Boot + table-derived |
| No records module/section | Missing |
| Zones | Still PL `zoneForPosition` naming (spots OK-ish for modern La Liga) |
| Types | Imports race insight from `premier-league-types` |
| Fun facts | Thinner curated set (10 vs PL 12) |

Openfootball Spain feed is wired (same cascade as Premier League).
