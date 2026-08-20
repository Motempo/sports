# Adding a sport — checklist

Mirror an existing sport (prefer Premier League for club leagues, F1 for season calendars, World Cup for knockout tournaments).

## 1. Product decisions

- [ ] Competition format (knockout / league / season calendar)
- [ ] Auto current season vs fixed season year
- [ ] Free data path (primary API + seed minimum; open mirror if APIs are paid-tier)
- [ ] Family-friendly: no betting widgets, no licensed marks that need clearance

## 2. Registry & SEO

- [ ] Add `SportConfig` in `lib/sports.ts` (`available: true` when ready)
- [ ] Update sitemap via existing helpers (automatic if in `SPORTS`)

## 3. Data layer

- [ ] `lib/{sport}-types.ts`, `lib/{sport}-data.ts`, `lib/{sport}-phase.ts`, `lib/{sport}-guide.ts`
- [ ] Clubs/teams seed JSON under `data/`
- [ ] Implement cascade: API → optional openfootball → seed
- [ ] Reuse `lib/league-standings.ts` or `match-schedule.ts` where format matches

## 4. News & facts

Per [`data/sources/README.md`](../data/sources/README.md):

1. Ask Grok to research reliable X/news sources for the sport  
2. Create `data/sources/{slug}.json` (use `world-cup.json` template)  
3. Map `rssUrl` for live news without X API (prefer feeds that include image/video media tags)
4. Add `data/fun-facts/{slug}.json`  
5. Register in `lib/facts.ts` and `lib/sport-sources.ts`  
6. Confirm `/api/news?sport=` and `/api/facts?sport=`

## 5. UI shell

- [ ] `app/{slug}/page.tsx` + `opengraph-image.tsx`
- [ ] `components/sports/{Sport}PageContent.tsx` using `SportPageShell` (same 8-section order as F1 / World Cup / Premier League / La Liga)
- [ ] Featured next-event card (`FeaturedMatchCard` or F1 equivalent)
- [ ] Sport-specific rail (compact: title + chips + one intro line), how-it-works, standings/schedule
- [ ] Awards + records sections when content exists
- [ ] `components/ads/{Sport}AdPlacements.tsx`
- [ ] Add `/{slug}` (+ trailing slash) to `middleware.ts` `config.matcher` (last-viewed sport cookie)

## 6. Verify

- [ ] Renders with API key missing (seed path)
- [ ] Mobile schedule + standings
- [ ] Sport appears in selector
- [ ] News/facts load for slug
- [ ] Docs: add `docs/sports/{slug}.md` and link from `docs/README.md`
