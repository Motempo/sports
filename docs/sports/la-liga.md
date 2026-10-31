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
| Standings | `lib/la-liga-standings.ts` — points, then head-to-head (mini-table when 3+ clubs are level; both meetings required), then overall goal difference and goals scored. Header matchday is the highest real round with a finished game (`lib/league-matchdays.ts`) |
| Key libs | `la-liga-data.ts`, `espn-league-data.ts`, `la-liga-phase.ts`, `la-liga-guide.ts`, `la-liga-types.ts` |

## Club names

Every La Liga surface (next-match card, match list, table, form book, race labels, awards, records) uses one short display name per club from `lib/club-display-name.ts`. Official forms such as “RCD Espanyol de Barcelona” or “Club Atlético de Madrid” are not shown. Examples: Espanyol, Málaga, Real Madrid, Atlético Madrid, Athletic Club, Real Sociedad, Barcelona. Accents stay. A missing short name falls back to a cleaned official name, then the club code, then “Club”.

## UI

- Shared `SportPageShell` with `pairLead` and `pairColumns="equal"`: from 900px the next-match card and match list share the row 50/50 (MOT-76). Premier League still uses the narrower `league` split. Below 900px they stack.
- Featured next-match card uses embedded chrome with **regular** density so the stadium photo sits to the right of the text on large screens (not a bottom strip).
- Stadium image is the next match's home ground: same-origin generated aerial at `public/venues/football/<slug>.webp`, mapped in `data/football-venue-photos.json`. No photo credit.
- Shared `ScheduleByDay` `variant="league"`: next three match days in a compact grid (one / two / three columns by container width). "Show more days" loads further days.
- League table refreshes on open via `router.refresh()`, then every 3 minutes. Upstream payloads share the 90s sports cache with Premier League
- Finished fixtures in Matches open a next-match-style detail modal
- `LaLigaSeasonRail`, reuses PL `LeagueTable` + `RaceTracker`
- Season Awards project a finish in `lib/award-chances.ts` (`formProjectionChances`; football rates in `lib/football-award-chances.ts`). Formula 1 does not use that path. Title: projected points = points now + matches left × a blend of the club's points per match and the league average. The club's own rate gets weight `played / (played + 8)`. Chances are a softmax of those projections whose temperature is `sqrt(matches left × 4)` (2 × sqrt(matches left)), so a lead shows early and the spread shrinks as the fixtures run out. A club that cannot catch the leader even by winning every match left (3 points each) shows under 1% (`<1%`), not 0%. At 0 matches left the leader is 100%. Pichichi uses the same projection on goals per match and the club's matches left, with temperature `sqrt(matches left × 2.25)`. A player who cannot catch up even with a hat-trick in every match left shows under 1%. Whole percents on those two cards sum to 100. Zamora, Europe, and survival still split today's table among the names shown. Not betting odds.
- `HowLaLigaWorks`, news/facts, ads, OG image

## Known parity gaps vs Premier League

| Gap | Notes |
|-----|-------|
| Awards | Title and Pichichi project a finish from current form, shrunk toward the average, with a spread that shrinks as matches run out. Zamora, Europe, and survival are still a snapshot of today's table |
| No records module/section | Missing |
| Zones | Still hardcoded 1–4 Champions League, 5 Europa League, 6 Conference League, 18–20 relegation in `la-liga-standings.ts` and `league-standings.ts`. Not adjusted for the UEFA coefficient or Copa del Rey |
| Types | Imports race insight from `premier-league-types` |
| Fun facts | Thinner curated set (10 vs PL 12) |

Openfootball Spain feed is wired (same cascade as Premier League).
