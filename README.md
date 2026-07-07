# Motempo Sports

World Cup 2026 tracker at [sports.motempo.com](https://sports.motempo.com).

## Stack

- Next.js 15 + TypeScript + Tailwind CSS
- football-data.org (matches), RSS (news), static JSON + Wikipedia (fun facts)
- Linear (feedback)

## Local dev

```bash
cp .env.example .env.local
# Add FOOTBALL_DATA_API_KEY (free at football-data.org)

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

1. Import `Motempo/sports` on Vercel Hobby
2. Set env vars from `.env.example`
3. Add custom domain `sports.motempo.com`
