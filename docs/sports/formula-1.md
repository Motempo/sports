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
| Supplement | OpenF1 sessions |
| Seed | `data/f1-season-seed.json`, constructor colors, profile meta |
| Env | `F1_SEASON` (defaults to calendar year) |
| Key libs | `lib/f1-data.ts`, `f1-phase.ts`, `f1-guide.ts`, `f1-awards.ts`, `f1-records.ts`, `f1-types.ts` |
| Awards progress | Bar = completed Grands Prix / calendar length (not title-gap tightness). Same rule on WC / La Liga awards. |

## Returning-user layout

Shared `SportPageShell` order (same as World Cup / Premier League / La Liga): compact rail → next event → **This Weekend** (session schedule — never labeled “Matches”) → news/facts → championship standings → How F1 Works → **Track Profiles** carousel → awards → records.

The next-session card uses three paragraphs (`featuredF1EventParagraphs`): what the session is (with commentator-style track colour plus Jolpica win history via `getCircuitTrackFact`), a paddock/form-book read from the standings, and how the result hits the drivers. No betting odds and no invented expert quotes. On large screens a Wikipedia **circuit schematic / layout map** (official-style track diagram) fills the right half of the card; on narrow screens it sits under the text.

Do **not** overload `MatchInfo` for F1 — use F1-specific types.
