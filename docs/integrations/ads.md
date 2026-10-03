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

Config: `lib/ads-config.ts`. Consent: `lib/ad-consent.ts` + cookie notice (`components/legal/CookieNotice.tsx`). The notice is a non-modal region landmark, not a dialog, because the rest of the page stays usable. `public/ads.txt` for sellers.

## Placements

Per-sport components under `components/ads/`. Typical slots: header, beside standings, mid-content, feed-adjacent.

**Do not** place ads:

- Inside the knockout bracket tree  
- Inside match cards  
- Overriding hero/rail content with sticky badges  

Max ~2–3 units mobile, ~3–4 desktop (plan guidance).

## Networks

1. **Google AdSense** — primary launch path  
   - Site verification uses `<meta name="google-adsense-account" content="ca-pub-…">` from root metadata (`app/layout.tsx`). Publisher id defaults to `ca-pub-8086154575408312` and follows `NEXT_PUBLIC_ADSENSE_CLIENT`.  
   - This is Google's ownership check for sites that should not place the AdSense code snippet on every page ([Connect your site to AdSense](https://support.google.com/adsense/answer/7584263)). It does not request `pagead2.googlesyndication.com`.  
   - `public/ads.txt` stays the authorized-sellers file (`google.com, pub-8086154575408312, DIRECT, …`). Ads.txt does not verify site ownership and does not load scripts.  
   - `adsbygoogle.js` is inserted by `AdProvider` only after the visitor accepts ad cookies, and only when `NEXT_PUBLIC_ADS_ENABLED`, `NEXT_PUBLIC_ADS_PLACEMENTS_LIVE`, and `NEXT_PUBLIC_ADS_PROVIDER=adsense` are set. Consent Mode defaults stay `denied` in the root layout and update to `granted` before the loader is added.  
   - Ad units still only render when placements are live and the visitor accepts ad cookies  
2. **NitroPay** — optional sports-friendly A/B  
3. Future: Mediavine Journey / Raptive when traffic thresholds hit  

Block in dashboards: gambling/betting, dating, alcohol, mature, weight-loss spam, etc.

## Content Security Policy

Response headers are set in `next.config.ts` via `lib/security-headers.ts`. The CSP is **`Content-Security-Policy-Report-Only`**.

The AdSense loader in `app/layout.tsx` is on every page, even while placements are off. Google’s AdSense CSP guidance does not support a frozen domain allowlist (ad and consent hosts change) and the strict nonce policy they document includes `'unsafe-eval'`. Enforcing an allowlist can blank ads; enforcing `'unsafe-eval'` weakens the script policy. Report-only keeps crests, Wikimedia images, and the feedback dialog working while violations stay visible in the browser console.

`script-src` allows `'self'`, `'unsafe-inline'` (Next.js bootstrap, theme init, consent default/update), Google ad/consent hosts, and `*.nitropay.com`. It does **not** allow `'unsafe-eval'` in production, so eval from the ad loader still reports.

When ads are approved and a consented session reports no unexpected violations, promote the header to enforcing `Content-Security-Policy`. Prefer a per-request nonce in middleware (Next.js applies it to its own scripts when the request carries the policy) over keeping this host list forever, and add `'unsafe-eval'` only if that live session still needs it.
