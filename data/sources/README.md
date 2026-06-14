# Sport news & fun-fact sources

Each sport has its own source config in this folder (`{sport-slug}.json`).

## Roles

- **News sources** (`newsHandles`): latest developments, breaking news, and upcoming coverage.
- **Fun fact sources** (`factHandles`): historical facts, stats, and analytical accounts that fit the sport's story.

## Adding a new sport

1. Ask **Grok** to research the most reliable and interesting X/news sources for that sport (official accounts, major media, respected journalists, national teams, and engaging analysts).
2. Create `{sport-slug}.json` using `world-cup.json` as a template.
3. Map `rssUrl` where the outlet publishes RSS (required for live news without a paid X API).
4. Add `data/fun-facts/{sport-slug}.json` for historical seed facts.
5. Wire the sport slug through `/api/news?sport=` and `/api/facts?sport=`.

## World Cup

Configured from the curated expert and outlet list. News mixes ~50% individual journalists/analysts (via dedicated Google News feeds) with ~50% official and major outlets. Fun facts alternate the same way — 15 expert voices, 15 organizations.
