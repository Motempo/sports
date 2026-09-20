# User reports fix plan

**Pulled:** 2026-09-20 from `GET https://sports.motempo.com/api/feedback/recent`  
**Open Linear issues:** 4 (`openCount: 4`) · **In-scope for Motempo/sports:** 3  
**Out of scope:** MOT-46 (`[music/explore]`) — route to Motempo Music

Full Linear bodies are truncated by `/api/feedback/recent` (`descriptionPreview` = first line, 160 chars). Titles below use the API text; ellipsis marks truncation.

---

## Snapshot

| ID | App | State | Severity | Summary |
|----|-----|-------|----------|---------|
| [MOT-52](https://linear.app/motempo/issue/MOT-52) | sports / premier-league | Backlog | **P0** | League table outdated — needs fresher live standings |
| [MOT-53](https://linear.app/motempo/issue/MOT-53) | sports / premier-league | Backlog | **P1** | Stadium image low quality — want full exterior (+ consistent exteriors) |
| [MOT-48](https://linear.app/motempo/issue/MOT-48) | sports / formula-1 | Backlog | **P1** | News from RSS/Google instead of X despite APIXAPI |
| [MOT-46](https://linear.app/motempo/issue/MOT-46) | music / explore | Backlog | n/a | Save only 5 tracks — **not this repo** |

Recommended ship order: **MOT-52 → MOT-53 → MOT-48** (table correctness first; images next; news needs prod env + code polish).

---

## MOT-52 — Premier League table outdated

### User report (API)

> The Premier League table at https://sports.motempo.com/premier-league displays outdated information. Please imple…

### Verified on production (2026-09-20)

- Payload `source` = **`openfootball`**
- All 20 clubs show **`played: 4`** (40 finished fixtures → through Matchday 4)
- Matchday 5 fixtures present with **null scores** while ESPN’s calendar year feed already has finished results through **2026-09-18 … 2026-09-20**

So the table is roughly **one matchday behind** live football.

### Current cascade

`lib/premier-league-data.ts` → `fetchPremierLeagueSeason()`:

1. **football-data.org** `PL/matches` (if `FOOTBALL_DATA_API_KEY` and season key = current) → source `"api"`
2. **ESPN** scoreboard scrape (`lib/espn-league-data.ts`) → `"espn"`
3. **openfootball** JSON / england `.txt` → `"openfootball"`
4. **seed** empty early MD grid → `"seed"`

Standings are **computed from finished fixtures** (`lib/league-standings.ts`), not from a dedicated standings endpoint. Page is `force-dynamic` + client `router.refresh` every 3 minutes — caching is not the bottleneck.

### Root causes

1. **ESPN full-season date range is broken.**  
   `espnSeasonDateRange("2026-27")` → `20260801-20270531`, which returns **0 events**.  
   `dates=2026` returns a full season board (~374 events). ESPN never successfully supplies the season, so the cascade falls through.
2. **football-data is not winning in prod** (no key, failed call, or season-key mismatch) → page lands on openfootball.
3. **openfootball lags** on weekend scores (MD5 listed without FT scores).
4. Even when football-data *does* win, the cascade is “first non-null wins,” not “freshest finished-match count wins” — a lagging primary can block a fresher mirror.

Docs drift: `docs/sports/premier-league.md` still lists openfootball as primary; code + `docs/integrations/data-sources.md` describe football-data → ESPN → OF → seed.

### Fix plan

| Step | Change | Files |
|------|--------|-------|
| 1 | Fix ESPN date query: prefer `dates=${startYear}` (and/or month windows that return events). Reject empty boards. Add a unit/regression test for `espnSeasonDateRange` / fetch acceptance. | `lib/espn-league-data.ts`, new test if present pattern allows |
| 2 | Prefer the cascade candidate with the **most finished matches** (and current season), instead of strict first-success. Keep seed last. | `lib/premier-league-data.ts`, `lib/la-liga-data.ts` (same ESPN helper) |
| 3 | Optional: when `FOOTBALL_DATA_API_KEY` has access, use `/competitions/PL/standings` (interface already sketched elsewhere) or merge FT scores from ESPN into the schedule. | `lib/football-data.ts`, `lib/premier-league-data.ts` |
| 4 | Surface source + “as of / matchday” more clearly near `LeagueTable` so lag is obvious in ops. | `components/sports/PremierLeaguePageContent.tsx` |
| 5 | Align docs with real cascade + “freshest wins” rule. | `docs/sports/premier-league.md`, `docs/integrations/data-sources.md`, `docs/sports/la-liga.md` if mirrored |

### Acceptance

- After a weekend slate finishes on ESPN, PL table `played` matches ESPN within one refresh cycle (~3 min).
- With ESPN date fix alone (no football-data key), cascade can serve `"espn"` with MD5+ scores.
- La Liga does not regress (shares ESPN helper).
- Docs match code.

### Constraints

$0/month · free APIs · no Redis/DB · never expose keys · current season only (no prior-season OF fallback).

---

## MOT-53 — Stadium image low quality / exterior views

### User report (API)

> The current stadium image is low quality. Please replace it with a full exterior view of the stadium. Additionally, generate consistent exterior images in the s…

Likely intent: **full exterior** for the featured PL stadium, plus **consistent exterior treatment** across venues (same visual language).

### Current behavior

- Resolver: `lib/venue-image.ts` (Wikipedia / Wikimedia Commons)
- PL next-match card + finished-match modal (`/api/venue-image`) share the same path
- Home grounds: `data/pl-home-venues.json` via `lib/club-home-venues.ts`
- Stadium scoring **boosts `aerial|panorama`** (+16) — leftover from the aerial-venue work that F1 still needs
- Thumbnails via `iiurlwidth=1600`; `preferUploadUrl` often prefers **thumb** over original
- Cache key version: `aerial-oblique-v1` (24h in-process + CDN `s-maxage=86400`)

F1 circuits correctly prefer oblique aerials — **do not change `kind: "circuit"`**.

### Root causes

1. Stadium scorer favors aerial/overhead, not street-level exterior.
2. Wiki lead images for grounds are often aerial or interior.
3. Soft 1600px thumbs on large card wells.
4. No curated exterior overrides (earlier aerial curated assets were removed after live Commons logic landed).

### Fix plan

| Step | Change | Files |
|------|--------|-------|
| 1 | Stadium-only scoring: boost `exterior`, `facade`, `outside`, `stand`, `entrance`; **penalize** `aerial`, `drone`, `interior`, `crowd`, close-ups. Leave circuit scoring alone. | `lib/venue-image.ts` |
| 2 | Commons search queries for stadiums: ``${name} exterior``, ``${name} stadium exterior`` (mirror circuit aerial search path). | `lib/venue-image.ts` |
| 3 | Prefer **original** upload URL (or ≥2000px) for stadiums; keep reasonable size for circuits if needed. | `lib/venue-image.ts` |
| 4 | Optional curated fallback: `data/pl-venue-exteriors.json` + `public/venues/exterior/` for clubs where Commons has no good exterior — same style across set (GenerateImage only for gaps). Apply same pattern to La Liga if parity desired. | new data + assets, `lib/venue-image.ts` |
| 5 | Bump `CACHE_VERSION` (e.g. `stadium-exterior-v1`) so prod drops stale aerial picks. | `lib/venue-image.ts` |

### Acceptance

- Featured PL stadium photo is a clear **full exterior** (not soft aerial/interior).
- F1 next-race cards still show oblique aerial track photos.
- Re-resolving the same venue after cache bump returns the new preference without redeploy tricks beyond version bump.

### Constraints

Free Wikimedia first · optional Grok only for name resolve · no paid image CDN · $0/month · family-friendly imagery.

Related open draft PR context: `#53 Use aerial venue photos for next-event cards` — supersede/coordinate so stadium path goes **exterior**, not aerial.

---

## MOT-48 — F1 news should come from X

### User report (API)

> The news appears to be pulled from other sources instead of X. Since we have APIXAPI access, please pull information directly from X. There's no need to waste t…

### Verified on production (2026-09-20)

`GET /api/news?sport=formula-1` returns Google News / publisher URLs, e.g.:

- ids like `formula-1-ChrisMedland-4-https://news.go…`
- links to `racer.com`, `speedweek.com`, etc.

**Not** `formula-1-x-…` / `x.com/…/status/…`.

### Current behavior

Code already prefers X when configured (commit history / MOT-48 work):

1. `lib/news.ts` → if `APIXAPI_KEY` / `APITWITTER_API_KEY` / `API_TWITTER_KEY` → `lib/x-news.ts` (ApiTwitter / APIXAPI)
2. Else or empty → RSS / Google News from `data/sources/formula-1.json`

Handles in `formula-1.json` are already X-oriented (`F1`, `SkySportsF1`, journalists, teams). Fallback RSS makes cards look like outlet articles.

### Root causes

1. **Most likely:** `APIXAPI_KEY` (or alias) **not set / invalid on Vercel** → permanent RSS path.
2. Key present but ApiTwitter errors swallowed (`!res.ok` / catch → `[]`) → silent RSS fallback.
3. Keyword filter empties the X result set → RSS.
4. Docs lag: BRD FR-N1 / architecture diagram still describe RSS-only.

### Fix plan

| Step | Change | Owner |
|------|--------|-------|
| 1 | Confirm Vercel env has a working `APIXAPI_KEY` (or documented alias). Smoke-check `/api/news?sport=formula-1` for `x.com` status URLs. | Ops / deploy |
| 2 | Add structured server log (no key leakage) when X path is skipped: `unconfigured` \| `http_error` \| `empty` \| `filtered_empty`. | `lib/x-news.ts`, `lib/news.ts` |
| 3 | Optional UI/debug: include `provider: "x" \| "rss"` on the news API payload (and optionally a quiet label in the widget). | `app/api/news/route.ts`, `NewsWidget` |
| 4 | Re-check handle list / keyword pattern if X returns rows but all drop. Cap remains 12 handles for spend control. | `data/sources/formula-1.json`, `lib/x-news.ts` |
| 5 | Update BRD FR-N1 + architecture mermaid: X preferred, RSS fallback. | `docs/BRD.md`, `docs/architecture.md`, `docs/integrations/data-sources.md` |

### Acceptance

- With a valid key, F1 news cards link to X status URLs and ids use the X prefix.
- Without a key, RSS still works (no blank widget).
- Ops can tell from logs/API why X was skipped.

### Constraints

RSS must remain fallback · keys server-side only · ApiTwitter credits are the cost lever (cap handles) · $0 baseline without the key still works via RSS.

---

## MOT-46 — Music (out of scope)

> Why did the explore page save only 5 tracks instead of the full selection?

Belongs to **Motempo Music**, not `Motempo/sports`. No code change here. Forward / close-as-wrong-app in Linear triage (oo).

---

## Implementation notes

- Prefer **one PR per ticket** (or 52+53 together if touching shared league pages; keep 48 separate because of env dependency).
- After each ship, oo/deploy can call `POST /api/feedback/close-shipped` for the matching identifiers.
- Re-pull `/api/feedback/recent` before starting work in case new reports land (MOT-52/53 were filed the same day as this plan).

## Suggested Linear states after triage

| ID | Next state | Note |
|----|------------|------|
| MOT-52 | Todo / In Progress | P0 — ESPN date bug + freshest-wins |
| MOT-53 | Todo | P1 — stadium exterior scoring + cache bump |
| MOT-48 | Todo (blocked on env) | Code largely done; verify key then observability |
| MOT-46 | Cancel or move to Music | Wrong app |
