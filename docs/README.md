# Motempo Sports — Documentation Index

**Product:** Motempo Sports · **URL:** https://sports.motempo.com · **Repo:** Motempo/sports  
**Role of this folder:** Durable BRD + architecture for agents and humans. No formal Sports BRD existed in-repo before Aug 2026; this corpus is consolidated from Cursor plans, chat decisions, and a full code review.

## Start here

| Doc | Purpose |
|-----|---------|
| [BRD.md](./BRD.md) | Product requirements, constraints, audience, roadmap signals |
| [architecture.md](./architecture.md) | Stack, data flow, APIs, env vars, caching, security notes |
| [adding-a-sport.md](./adding-a-sport.md) | Repeatable checklist to onboard a new sport |

## Sports

| Doc | Status |
|-----|--------|
| [sports/world-cup.md](./sports/world-cup.md) | Live — founding product |
| [sports/formula-1.md](./sports/formula-1.md) | Live — current homepage (`CURRENT_SPORT_SLUG`) |
| [sports/premier-league.md](./sports/premier-league.md) | Live — near feature-complete |
| [sports/la-liga.md](./sports/la-liga.md) | Live — thinner clone of PL (parity gaps noted) |

## Integrations

| Doc | Purpose |
|-----|---------|
| [integrations/data-sources.md](./integrations/data-sources.md) | football-data, openfootball, Jolpica, OpenF1, RSS, Wikipedia |
| [integrations/feedback-linear.md](./integrations/feedback-linear.md) | Feedback → Linear, Grok improve, ops close-shipped |
| [integrations/ads.md](./integrations/ads.md) | Family-friendly ads, kill switches, placements |

## Source corpus (external)

Original planning artifacts live outside the repo. Paths:

| Plan | Path |
|------|------|
| Founding World Cup plan | `~/.cursor/plans/world_cup_tracker_app_6d7bbc04.plan.md` |
| Formula One page | `~/.cursor/plans/formula_one_page_b600a36e.plan.md` |
| Sports site ads | `~/.cursor/plans/sports_site_ads_0c5cb1e2.plan.md` |
| Motempo ops loop (oo) | `~/.cursor/plans/motempo_ops_loop_ee5f146b.plan.md` |

Related nested app: [`oo/README.md`](../oo/README.md) — ops dashboard consumer of Sports Linear feedback.

Thin in-repo stubs still useful: [`README.md`](../README.md), [`data/sources/README.md`](../data/sources/README.md).

## Maintenance

When product decisions change, update the relevant doc in this folder **in the same PR/change** as the code. Prefer editing here over rediscovering requirements from chat history.
