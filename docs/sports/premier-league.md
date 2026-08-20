# Premier League

**Slug:** `premier-league` · **Route:** `/premier-league`  
**Origin:** Aug 2026 request — “World Cup replica adapted for league table”  
**Chat:** agent transcript `554aa49f-e1bc-4bb8-aff1-d5965d9eee7f`

## Product intent

Same shell as World Cup / F1, but competitive centerpiece is the **league table** (not knockouts): European qualification + relegation zones, fixtures/results, season races, how PL works, news, fun facts, awards, records.

## Decisions (from questionnaire)

- Track **whatever football-data returns as current** (auto season), with openfootball fallback when free football-data tier lacks PL
- Full shell in nav next to F1 / World Cup

## Data

| Layer | Detail |
|-------|--------|
| Primary | openfootball `en.1.json` for the **current** season (`2026-27`, …) |
| Fallback | football-data `PL` (+ scorers for Golden Boot when key has access) |
| Seed | `data/pl-clubs-seed.json` + short matchday grid for the current season when mirrors lag |
| Standings | `lib/league-standings.ts` — zones 1–4 CL, 5 EL, 6 ECL, 18–20 relegated |
| Key libs | `lib/premier-league-data.ts`, `*-phase.ts`, `*-guide.ts`, `*-awards.ts`, `*-records.ts`, `*-types.ts` |

## UI

- Shared `SportPageShell` + featured next-match card (description / form-book / player impact)
- `PremierLeagueRail`, `LeagueTable`, `RaceTracker`
- `HowPremierLeagueWorks`, awards + records sections
- Shared `ScheduleByDay` with `stage: "LEAGUE"` / matchday in `group`
- Ads: `PremierLeagueAdPlacements`

## Status

Near feature-complete relative to F1/WC richness. Reference implementation for other club leagues.
