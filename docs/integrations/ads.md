# Advertising

**Plan source:** `~/.cursor/plans/sports_site_ads_0c5cb1e2.plan.md`

## Audience stance

Family-friendly **general audience** (not child-directed COPPA network). Allow contextual sports/lifestyle ads; **aggressively block** sensitive categories — especially **sports betting / fantasy gambling**.

## Kill switches

| Env | Meaning |
|-----|---------|
| `NEXT_PUBLIC_ADS_ENABLED` | Master switch (default false until network approval) |
| `NEXT_PUBLIC_ADS_PLACEMENTS_LIVE` | Gate real slot rendering |
| `NEXT_PUBLIC_ADS_PROVIDER` | `adsense` \| `nitro` |

Config: `lib/ads-config.ts`. Consent: `lib/ad-consent.ts` + cookie notice. `public/ads.txt` for sellers.

## Placements

Per-sport components under `components/ads/`. Typical slots: header, beside standings, mid-content, feed-adjacent.

**Do not** place ads:

- Inside the knockout bracket tree  
- Inside match cards  
- Overriding hero/rail content with sticky badges  

Max ~2–3 units mobile, ~3–4 desktop (plan guidance).

## Networks

1. **Google AdSense** — primary launch path  
2. **NitroPay** — optional sports-friendly A/B  
3. Future: Mediavine Journey / Raptive when traffic thresholds hit  

Block in dashboards: gambling/betting, dating, alcohol, mature, weight-loss spam, etc.
