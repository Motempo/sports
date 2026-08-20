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
| Match watch links | Session watch links |

## Data

| Layer | Detail |
|-------|--------|
| Primary | Jolpica Ergast `https://api.jolpi.ca/ergast/f1` |
| Supplement | OpenF1 sessions |
| Seed | `data/f1-season-seed.json`, constructor colors, profile meta |
| Env | `F1_SEASON` (defaults to calendar year) |
| Key libs | `lib/f1-data.ts`, `f1-phase.ts`, `f1-guide.ts`, `f1-awards.ts`, `f1-records.ts`, `f1-types.ts` |

## Phase-dependent layout

- Pre-season / off-week: calendar + primer first  
- Race weekend: standings + This Weekend first  
- Season complete: final standings + champion callout  

Do **not** overload `MatchInfo` for F1 — use F1-specific types.
