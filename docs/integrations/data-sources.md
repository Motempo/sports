# Data sources

## Policy

Free-first. Cascade: **live API → community mirror → local seed**. Keys stay server-side.

## football-data.org

- Env: `FOOTBALL_DATA_API_KEY` (`X-Auth-Token`)
- Competitions: `WC` (World Cup), `PL` (Premier League), `PD` (La Liga / Primera División)
- Free tier: rate limits; PL/PD may require plan access
- Module: `lib/football-data.ts`, scorers via `lib/fetch-football-scorers.ts`

## openfootball

- No auth; public-domain fixtures/results
- Club leagues (primary for PL + La Liga): GitHub raw
  `https://raw.githubusercontent.com/openfootball/football.json/master/{season}/{en.1|es.1}.json`
- World Cup mirrors still via worldcup.json / GitHub Pages where configured
- Modules: `lib/openfootball-data.ts` (WC), `premier-league-data.ts`, `la-liga-data.ts`
- Cascade for club leagues: **openfootball → football-data.org → seed**
- Season files lag the calendar; we try current then previous `yy-yy` keys

## F1

| Source | Use |
|--------|-----|
| Jolpica Ergast | Calendar, standings, results |
| OpenF1 | Session start times merge |
| Seed JSON | Offline / preview |

Modules: `lib/f1-data.ts` (+ related `f1-*.ts`).

## News (RSS)

- Config: `data/sources/{slug}.json`
- Mix of outlet RSS + Google News journalist feeds
- Parse: `fast-xml-parser` in `lib/news.ts`
- Avatars: unavatar.io via `lib/sport-sources.ts`
- **Not using:** X API, NewsAPI (paid)

## Fun facts

- Seed: `data/fun-facts/{slug}.json`
- Enrichment: Wikipedia REST summary when `wikipediaTitle` set
- Module: `lib/facts.ts`

## Venue photos

- Next-event card: Wikipedia / Wikimedia Commons
- F1 uses the circuit (prefer aerial track photos); football uses the match stadium or the home club’s ground
- Module: `lib/venue-image.ts`

## Other

| Source | Use |
|--------|-----|
| flagcdn.com | National flags (WC) |
| REST Countries | Optional country metadata (founding plan) |
| xAI Grok | Feedback improve; optional venue resolve |

Adding sources: follow `data/sources/README.md`.
