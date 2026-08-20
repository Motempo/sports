# Motempo Sports — Business Requirements Document (BRD)

**Version:** 1.0 (consolidated Aug 2026)  
**Status:** Living document — synthesized from Cursor plans + shipped code  
**Owner:** Motempo Sports team

---

## 1. Vision

Motempo Sports is a **multi-sport companion site** for casual fans, parents, and kids. It answers: *what's happening now*, *who's leading*, *when to watch*, and *how the sport works* — without betting, jargon overload, or telemetry dashboards.

**Production:** https://sports.motempo.com  
**Brand line:** Sports by Motempo

---

## 2. Non‑negotiable constraints

| Constraint | Requirement |
|------------|-------------|
| **Cost** | Optimize for **$0/month** experiment (Vercel Hobby, free data APIs, no Redis/DB/auth for the public site) |
| **Audience** | Family-friendly general audience |
| **Monetization** | Ads only with **aggressive category blocks**; never sports-betting / gambling adjacency |
| **No paid deps (v1)** | Explicitly excluded: API-Football, Sportmonks, NewsAPI, X API, Vercel KV/Postgres, Clerk (on sports), Replit |
| **Branding** | Use words for tournament names; do **not** use official FIFA/F1 protected logos |
| **Feedback** | Anonymous submit → Linear (`motempo` team), no contact fields, Ads-identical UX |
| **Freshness** | Prefer live cascade → community mirror → local seed; refresh on page load |

---

## 3. Product principles

1. **Explain context, not just numbers** — plain-language races, gaps, and primers.
2. **Mobile-first, local timezone** — schedules grouped by the user's local day.
3. **Seed fallback always works** — pages must render useful content offline of upstream APIs.
4. **X-inspired UI** — feed rows, minimal chrome (see founding design tokens in architecture doc).
5. **Per-sport SEO routes** — `/world-cup`, `/formula-1`, `/premier-league`, `/la-liga`; homepage redirects to `CURRENT_SPORT_SLUG`.
6. **Sport onboarding is repeatable** — see [adding-a-sport.md](./adding-a-sport.md).

---

## 4. Current sport portfolio

| Slug | Label | Format | Route | Notes |
|------|-------|--------|-------|-------|
| `formula-1` | Formula 1 | Season / standings | `/formula-1` | **Homepage** (`CURRENT_SPORT_SLUG`) |
| `world-cup` | FIFA World Cup | Groups + knockout | `/world-cup` | Founding product (WC 2026) |
| `premier-league` | Premier League | League table | `/premier-league` | Near feature-complete |
| `la-liga` | La Liga | League table | `/la-liga` | Live; thinner vs PL (awards/records/openfootball gaps) |

**Sport selector:** lists available sports + “Suggest a sport” → feedback category `sport-request`.

---

## 5. Cross-cutting UX requirements

Every sport page should provide:

1. **Phase rail** — where we are in the tournament/season  
2. **Primary competitive view** — bracket *or* table / championship standings (phase-aware order)  
3. **Schedule** — today's / upcoming fixtures or sessions by local day  
4. **How it works** — collapsible educational primer  
5. **News (3 + load more → modal)** and **Fun facts (same pattern)**  
6. **Awards / records** where curated data exists (WC, F1, PL; La Liga gap)  
7. **Ad placements** behind kill switches (never inside match cards / bracket tree)  
8. **Footer** — Submit Feedback (identical across Motempo apps)

---

## 6. Functional requirements (site-wide)

### 6.1 Data & scores

- FR-D1: Match/standings data prefers authoritative free API, then open mirror, then seed.
- FR-D2: Never expose API keys to the browser.
- FR-D3: Accept free-tier score delay; do not promise real-time betting-grade feeds.
- FR-D4: Club leagues use `stage: "LEAGUE"` and encode matchday in `group` (shared `MatchInfo`).

### 6.2 News & facts

- FR-N1: News from curated RSS / Google News per sport (`data/sources/{slug}.json`).
- FR-N2: Fun facts from static JSON + optional Wikipedia enrichment.
- FR-N3: Pagination default: offset/limit with `limit` default 3.

### 6.3 Feedback

- FR-F1: `POST /api/feedback` creates a Linear issue with explicit `appId` (`sports`).
- FR-F2: Optional Grok “Improve text” when `GROK_API_KEY` / `XAI_API_KEY` present.
- FR-F3: Rate limit submissions (10/IP/hour in-memory).
- FR-F4: Support `feedbackCategory`: `general` | `sport-request`.

### 6.4 Home / last-viewed sport

- FR-H1: Visiting `/` opens the user's last viewed available sport when an essential cookie is present; otherwise `CURRENT_SPORT_SLUG` (global default, currently Formula 1).
- FR-H2: Opening any available sport page updates the last-viewed cookie (1-year max-age, refreshed on each visit).
- FR-H3: Direct links to a specific sport URL always open that sport (memory only affects `/` and logo home link).

### 6.5 Legal & ads

- FR-L1: Privacy + Terms pages; cookie/consent notice for ads.
- FR-A1: Ads disabled until approval; `NEXT_PUBLIC_ADS_ENABLED` + `NEXT_PUBLIC_ADS_PLACEMENTS_LIVE`.
- FR-A2: Block gambling/betting, dating, alcohol, mature, etc. in network dashboards.

---

## 7. Explicit non-goals

- User accounts / personalization  
- Paid live-score partners (until experiment validates)  
- Betting odds, fantasy, or gambling UX  
- Official licensed tournament branding assets  
- Partner mobile REST API (pages SSR are the surface)  
- Slack/GitHub Issues intake (migrated to Linear; oo.motempo.com owns triage)

---

## 8. Success signals (informal)

- Pages render fully on seed when APIs fail  
- New sport follows the established shell in days, not weeks  
- Feedback loop closes via Linear + oo without Slack  
- Ads can be flipped on without layout rewrites  

---

## 9. Open product gaps (as of Aug 2026)

1. **La Liga parity** with Premier League (awards, records, richer curated facts).  
2. Ops API routes (`close-shipped`, `reopen`, `recent`) lack auth — treat as risk.  
3. Club-league openfootball seasons can lag (e.g. mid-August before the new `yy-yy` JSON lands); cascade tries current then previous season.

---

## 10. Related Motempo systems

| System | Relationship |
|--------|----------------|
| **oo.motempo.com** (`oo/`) | Triages Linear feedback, plan/implement agents |
| **Motempo Ads** | Source UX for Submit Feedback |
| **Linear team `motempo`** | Shared issue queue; route by `appId` |
