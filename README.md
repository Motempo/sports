# Motempo Sports

Multi-sport companion at [sports.motempo.com](https://sports.motempo.com) — Formula 1, FIFA World Cup 2026, Premier League, La Liga.

## Documentation

Product BRD, architecture, and per-sport specs: **[`docs/README.md`](./docs/README.md)**.

## Stack

- Next.js 15 + TypeScript + Tailwind CSS
- football-data.org / openfootball / Jolpica (matches & standings), RSS (news), static JSON + Wikipedia (fun facts)
- Linear (feedback)

## Local dev

```bash
cp .env.example .env.local
# Add FOOTBALL_DATA_API_KEY (free at football-data.org)

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Homepage redirects to the current sport (`CURRENT_SPORT_SLUG` in `lib/sports.ts`).

## Deploy (Vercel)

1. Import `Motempo/sports` on Vercel Hobby
2. Set env vars from `.env.example`
3. Add custom domain `sports.motempo.com`
