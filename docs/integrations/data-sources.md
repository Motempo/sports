# Data sources

## Policy

Free-first. Cascade: **live API → community mirror → local seed**. Keys stay server-side.

World Cup, Premier League, and La Liga seeds are fixture grids only. They leave scores null. A failed World Cup cascade must not mark past group kickoffs finished or fill in scores — standings from that path show 0 played, and the page says live data is unavailable (`formatMatchDataSource("seed")`).

## football-data.org

- Env: `FOOTBALL_DATA_API_KEY` (`X-Auth-Token`)
- Competitions: `WC` (World Cup), `PL` (Premier League), `PD` (La Liga / Primera División)
- Free tier: 10 requests/minute for the whole key. A 429 is not cached; the cascade falls through to ESPN / openfootball for that render and the next render tries football-data again
- PL/PD may require plan access
- Module: `lib/football-data.ts`, scorers via `lib/fetch-football-scorers.ts`
- World Cup venues: local fixtures and `data/wc2026-stadiums.json` first. One `/world-cup` render adds at most 4 `GET /v4/matches/{id}` calls, and only when a fixture is still missing a stadium. One isolate stays within that cap per minute, and does not retry a miss for 10 minutes. A missing venue is omitted (`lib/match-venue.ts`, `lib/venue-detail-budget.ts`)

## ESPN (club leagues — scrape fallback)

- No auth; public JSON scoreboard API
- Endpoints: `https://site.api.espn.com/apis/site/v2/sports/soccer/{eng.1|esp.1}/scoreboard?dates={year}`
- Module: `lib/espn-league-data.ts` — merges **start + end calendar years**, filters to Jul(start)→Jun(end) so prior-season spring fixtures drop out
- Matchweeks (`lib/league-matchdays.ts`): use ESPN `week` (number or `{ number }`) or note text such as `Matchweek 12` when the event has it. Otherwise rounds are inferred from kickoff clusters — a new round starts after a gap of three days, when a club would play twice, or when the slate is already full. A postponed fixture that falls between later rounds goes back to the earlier round still missing those clubs, so later matchweeks keep their numbers. The table’s matchday is the highest of those rounds with a finished game.
- Used alongside football-data.org; fresher than the openfootball mirror for live results
- Fetched through `cachedUpstreamFetch` (90s shared Data Cache). A page open inside that window reuses the two season boards (start year + end year) instead of calling ESPN again. The stored body keeps id, date, competitors, status, and venue so it fits the Data Cache 2MB entry cap
- Client `router.refresh()` on mount (and every 3 minutes while the page stays open) re-renders the dynamic page; it does not bypass the upstream TTL
- Refresh is that 90s window, filled when a page render misses the cache. There is no scheduled league sync

## openfootball

- No auth; public-domain fixtures/results
- Club leagues (mirror for PL + La Liga): GitHub raw
  `https://raw.githubusercontent.com/openfootball/football.json/master/{season}/{en.1|es.1}.json`
  and, when JSON is missing, football.db text:
  `england/{season}/1-premierleague.txt`, `espana/{season}/1-liga.txt`
- World Cup mirrors still via worldcup.json / GitHub Pages where configured
- Modules: `lib/openfootball-data.ts` (WC), `premier-league-data.ts`, `la-liga-data.ts`, `openfootball-league-txt.ts`
- GitHub raw URLs are requested as-is (no `?_=` cache buster) and stored only when the response is HTTP 200, for the same 90s window as the other sports payloads
- Cascade for club leagues: **football-data.org + ESPN + current-season openfootball in parallel → pick most finished fixtures** (ties: api → espn → openfootball) → current-season seed. Do not fall back to last season’s openfootball file, and ignore football-data when it still serves the prior season (that kept PL on 25/26 after 26/27 started). Helper: `lib/league-data-cascade.ts`.
- No Vercel Cron. The cache key includes a 90-second window, so a prefetch is abandoned when the window rolls. Hobby cron jobs run at most once per day (a schedule such as `0 */2 * * *` fails deployment). A schedule frequent enough to stay inside one window would add football-data.org calls on top of live traffic, against the 10 requests/minute free quota. `CRON_SECRET` is unused.
- Season keys use `yy-yy` form (`2026-27`); August+ uses the new start year.

## F1

| Source | Use |
|--------|-----|
| Jolpica Ergast | Calendar, standings, results, circuit win history for next-event copy |
| OpenF1 | Session start, end (`date_end`), and `is_cancelled` merge into the live badge. Without an end time, the badge uses the session-type window in `docs/sports/formula-1.md`. |
| Seed JSON | Offline / preview |
| Curated circuit colour | `lib/f1-circuit-facts.ts` — commentator-style track notes (MOT-50) |

Modules: `lib/f1-data.ts` (+ related `f1-*.ts`). Jolpica and OpenF1 use the same 90s `cachedUpstreamFetch` window as football-data / ESPN. A non-200 is not cached. Circuit win history no longer keeps an empty result for 12 hours.

## News (RSS + optional X)

- Config: `data/sources/{slug}.json`
- Mix of outlet RSS + Google News journalist feeds
- **X / APIXAPI (MOT-48):** when `APIXAPI_KEY` (or `APITWITTER_API_KEY`) is set, `/api/news` prefers live X timelines for `newsHandles` via ApiTwitter (`api.apitwitter.com`). Response includes `provider: "x" | "rss"` and `xSkipReason` when falling back (`unconfigured` | `http_error` | `empty` | `filtered_empty`). Falls back to RSS if the key is missing or timelines return empty.
- Parse: `fast-xml-parser` in `lib/news.ts`; X path in `lib/x-news.ts`
- Media: RSS `media:content` / `media:thumbnail` / `enclosure` (object or array), HTML `<img>` / `<iframe>` in descriptions, Atom `media:group`
- Google News items have no thumbnails in the feed. `/api/news` resolves `news.google.com/rss/articles/CBMi…` to the publisher URL (`lib/google-news.ts`) and scrapes `og:image` / `og:video` / `twitter:player` from that page (`lib/news-media.ts`). If the article page is blocked, it falls back to the publisher's own RSS (`/feed`, `/rss.xml`) and matches the story by URL. Enrichment runs only on the returned page or the opened detail, with a 30-minute in-process cache. `limit` defaults to 3 and is clamped to 1–10 so a caller cannot multiply those scrapes. `sport` must be a slug in `SPORTS`; anything else is 400.
- Article HTML, Google News landing pages, and the publisher RSS fallback are fetched with redirects followed manually, at most 5 hops (`lib/safe-http.ts`). Each hop is refused unless it is `http`/`https` and the host is public. Refused targets include loopback, private, link-local (`169.254.0.0/16`, `fe80::/10`, including the metadata address `169.254.169.254`), unique-local IPv6 (`fc00::/7`), IPv4-mapped and IPv4-translated IPv6, and decimal/octal/hex or shortened IPv4. A hostname is refused when any resolved address is in those ranges. A blocked hop is not requested.
- Prefer live outlet RSS when the publisher exposes thumbnails (BBC `feeds.bbci.co.uk`, Sky, Autosport, The Race, Guardian). Dead `newsrss.bbc.co.uk` URLs 404.
- Cards show a thumbnail (play badge if a video URL exists). The modal plays YouTube/Vimeo embeds or a file `<video>` when present, otherwise the image.
- Avatars: unavatar.io via `lib/sport-sources.ts`
- **Not using:** NewsAPI (paid)

## Fun facts

- Seed: `data/fun-facts/{slug}.json`
- Enrichment: Wikipedia REST summary when `wikipediaTitle` set
- Module: `lib/facts.ts`

## Venue photos

- Next-event card: Wikipedia / Wikimedia Commons (F1 circuits prefer oblique aerial photos from ~45°; stadiums prefer **full exterior / facade** photographs — MOT-53)
- F1 uses the circuit (prefer aerial track photos, skip SVG/layout maps); football uses Commons exterior search then wiki media-list with exterior-biased scoring
- Club home grounds: `data/pl-home-venues.json`, `data/la-liga-home-venues.json` fill empty openfootball venues for the featured card
- Past-match modal fetches `/api/venue-image` so the same stadium photo can load after a click
- Module: `lib/venue-image.ts` (`CACHE_VERSION` bumped when scoring changes), `lib/club-home-venues.ts`

## Other

| Source | Use |
|--------|-----|
| flagcdn.com | National flags (WC) |
| REST Countries | Optional country metadata (founding plan) |
| xAI Grok | Feedback improve; optional venue resolve |

Adding sources: follow `data/sources/README.md`.
