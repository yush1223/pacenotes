# Pacenotes

Route notes and a live split timer, for any game.

Write segment-by-segment route notes for any game, time yourself against them
with a live split timer, and track personal bests per segment. Publish a route
so anyone can follow it, or find one someone else already wrote and make it
your own.

## Stack

- React + Vite
- Supabase (Postgres, Auth, Row Level Security, Edge Functions)
- Steam's public store API (via Supabase Edge Functions, for game search/art)

## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```
