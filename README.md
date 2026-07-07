# Podcast Telegram Bot

Headless Hono API bot deployed on Vercel. Cross-posts podcast content to Twitter/X, Discord, LinkedIn, and Telegram.

## Tech Stack

- **Runtime**: Bun (local + Vercel via `bunVersion: "1.x"`)
- **Framework**: Hono 4
- **Deploy**: Vercel Functions (`api/[[route]].ts` catch-all)

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start dev server with hot reload |
| `bun test` | Run tests |
| `tsc` | Type-check |

## Endpoints

| Method | Path | Trigger |
|--------|------|---------|
| GET | `/api/check_bluesky` | Vercel Cron |
| POST | `/api/check_live` | Twitch EventSub |
| GET | `/api/check_tweets` | Vercel Cron |
| POST | `/api/create_episode` | Telegram webhook |
| POST | `/api/new_episode` | Notion webhook |
| GET | `/api/scheduled` | Vercel Cron |
| POST | `/api/tweet` | Supabase |

## Secrets

All configured via Vercel Environment Variables. See `.env.example` for the full list.
