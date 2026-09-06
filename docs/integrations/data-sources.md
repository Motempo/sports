# Data sources

## Policy

Free-first. Cascade: **live API → community mirror → local seed**. Keys stay server-side.

## football-data.org

- Env: `FOOTBALL_DATA_API_KEY` (`X-Auth-Token`)
- Competitions: `WC` (World Cup), `PL` (Premier League), `PD` (La Liga / Primera División)
- Free tier: rate limits; PL/PD may require plan access
- Module: `lib/football-data.ts`, scorers via `lib/fetch-football-scorers.ts`

## ESPN (club leagues — scrape fallback)

- No auth; public JSON scoreboard API
- Endpoints: `https://site.api.espn.com/apis/site/v2/sports/soccer/{eng.1|esp.1}/scoreboard`
- Module: `lib/espn-league-data.ts`
- Used when `FOOTBALL_DATA_API_KEY` is missing or football-data.org is still on the prior season; fresher than the openfootball mirror for live results
- Next.js fetch: `no-store` so a page open hits ESPN for a fresh table
- Client `router.refresh()` on mount (and every 3 minutes while the page stays open)
- Cron: `/api/cron/league-sync` also revalidates PL + La Liga pages every 2 hours

## openfootball

- No auth; public-domain fixtures/results
- Club leagues (primary for PL + La Liga): GitHub raw
  `https://raw.githubusercontent.com/openfootball/football.json/master/{season}/{en.1|es.1}.json`
  and, when JSON is missing, football.db text:
  `england/{season}/1-premierleague.txt`, `espana/{season}/1-liga.txt`
- World Cup mirrors still via worldcup.json / GitHub Pages where configured
- Modules: `lib/openfootball-data.ts` (WC), `premier-league-data.ts`, `la-liga-data.ts`, `openfootball-league-txt.ts`
- Cascade for club leagues: **football-data.org (same season only) → ESPN scoreboard scrape (uncached on page load) → current-season openfootball (JSON → league .txt) → current-season seed**. Do not fall back to last season’s openfootball file, and ignore football-data when it still serves the prior season (that kept PL on 25/26 after 26/27 started).
- Scheduled refresh: Vercel Cron hits `/api/cron/league-sync` every 2 hours (`vercel.json`) to revalidate `/premier-league` and `/la-liga`. No Cursor agent needed — Cron runs on Vercel. `CRON_SECRET` is optional hardening only.
- Season keys use `yy-yy` form (`2026-27`); August+ uses the new start year.

## F1

| Source | Use |
|--------|-----|
| Jolpica Ergast | Calendar, standings, results, circuit win history for next-event copy |
| OpenF1 | Session start times merge |
| Seed JSON | Offline / preview |
| Curated circuit colour | `lib/f1-circuit-facts.ts` — commentator-style track notes (MOT-50) |

Modules: `lib/f1-data.ts` (+ related `f1-*.ts`).

## News (RSS + optional X)

- Config: `data/sources/{slug}.json`
- Mix of outlet RSS + Google News journalist feeds
- **X / APIXAPI (MOT-48):** when `APIXAPI_KEY` (or `APITWITTER_API_KEY`) is set, `/api/news` prefers live X timelines for `newsHandles` via ApiTwitter (`api.apitwitter.com`). Falls back to RSS if the key is missing or timelines return empty.
- Parse: `fast-xml-parser` in `lib/news.ts`; X path in `lib/x-news.ts`
- Media: RSS `media:content` / `media:thumbnail` / `enclosure` (object or array), HTML `<img>` / `<iframe>` in descriptions, Atom `media:group`
- Google News items have no thumbnails in the feed. `/api/news` resolves `news.google.com/rss/articles/CBMi…` to the publisher URL (`lib/google-news.ts`) and scrapes `og:image` / `og:video` / `twitter:player` from that page (`lib/news-media.ts`). If the article page is blocked, it falls back to the publisher's own RSS (`/feed`, `/rss.xml`) and matches the story by URL. Enrichment runs only on the returned page (3 items) or the opened detail, with a 30-minute in-process cache.
- Prefer live outlet RSS when the publisher exposes thumbnails (BBC `feeds.bbci.co.uk`, Sky, Autosport, The Race, Guardian). Dead `newsrss.bbc.co.uk` URLs 404.
- Cards show a thumbnail (play badge if a video URL exists). The modal plays YouTube/Vimeo embeds or a file `<video>` when present, otherwise the image.
- Avatars: unavatar.io via `lib/sport-sources.ts`
- **Not using:** NewsAPI (paid)

## Fun facts

- Seed: `data/fun-facts/{slug}.json`
- Enrichment: Wikipedia REST summary when `wikipediaTitle` set
- Module: `lib/facts.ts`

## Venue photos

- Next-event card: Wikipedia / Wikimedia Commons (F1 circuits prefer schematic layout maps like the official site; stadiums prefer photographs)
- F1 uses the circuit (prefer aerial track photos); football uses the match stadium or the home club’s ground
- Club home grounds: `data/pl-home-venues.json`, `data/la-liga-home-venues.json` fill empty openfootball venues for the featured card
- Module: `lib/venue-image.ts`, `lib/club-home-venues.ts`

## Other

| Source | Use |
|--------|-----|
| flagcdn.com | National flags (WC) |
| REST Countries | Optional country metadata (founding plan) |
| xAI Grok | Feedback improve; optional venue resolve |

Adding sources: follow `data/sources/README.md`.
