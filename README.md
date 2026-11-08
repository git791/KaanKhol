# KaanKhol (कान खोल)

> "Open your ears." A trilingual railway-announcement decoder for Indian stations.

Indian railway platform announcements are repeated three times: regional language, Hindi, English. Over crackly speakers and crowd noise, each pass is partly lost, but the three passes carry the same facts. KaanKhol listens to all three, transcribes each with Gnani Prisma STT, fuses them, cross-checks against the timetable, and re-announces the verified facts in clear speech with Gnani Timbre TTS.

Built for the Gnani.ai "Great Indian AI Internship Challenge" (deadline Nov 10, 11:59 PM IST; submit by Nov 9).

- Primary award target: **Jugaad Genius**
- Supporting: **Noise Canceller**, **Real Deal**
- Team: **Bibi Sufiya Shariff**, **Mohammed Ayaan Adil Ahmed**

## One-paragraph pitch

A passenger records 20 to 60 seconds of a station announcement. KaanKhol transcribes it three times (one call per language), extracts train number, name, platform and delay, votes across the three transcripts, and checks every field against the timetable. Fields that agree are marked "verified"; conflicts are flagged. The verified announcement is then spoken back clearly with Timbre. A benchmark page shows how fact recovery holds up as noise rises and when audio is downsampled to 8 kHz telephony. A crowdsourced leaderboard ranks stations by announcement clarity.

## Documentation map (read in this order)

| # | File | Read it to learn |
|---|------|------------------|
| 1 | `README.md` | What and why (this file) |
| 2 | `AGENTS.md` | Rules for any AI agent or new dev working in the repo |
| 3 | `docs/PRD.md` | Product requirements, scope, scoring plan, success metrics |
| 4 | `docs/TECHNICAL.md` | Architecture, layers, stack, API contracts, code snippets |
| 5 | `docs/DESIGN.md` | Palette, fonts, 3D hero, motion, UI/UX style |
| 6 | `docs/ASSETS.md` | Source links (3D, icons, fonts, data) and image-generation prompts |
| 7 | `docs/USER_WORKFLOW.md` | End-user journey and screen-by-screen experience |
| 8 | `docs/SUBMISSION.md` | Competition rules checklist, LinkedIn/X post, demo script |
| 9 | `.agents/skills/*/SKILL.md` | Task-focused playbooks (STT, TTS, fusion, motion, 3D, proxy, submission) |

## Status

Steering documents only. No application code exists yet. Code blocks inside the docs are reference snippets for implementers, not a working codebase.

## Quick start for a new contributor

1. Read this file, then `AGENTS.md`, then `docs/PRD.md`.
2. Skim `docs/TECHNICAL.md` sections 1-4 (architecture and layers).
3. Open `docs/DESIGN.md` before touching any UI.
4. Pick a skill from `.agents/skills/` for the task at hand.
5. Day-1 verifications are listed in `docs/TECHNICAL.md` section 12. Do them first.

## Tech at a glance (all free tier)

- Frontend: Next.js 16 (or Vite + React 19), Tailwind v4, React Three Fiber v9, GSAP + Lenis, Motion v12
- Edge: Cloudflare Pages + Workers (Hono + Zod), D1 for leaderboard
- Speech: Gnani Prisma v2.5 (STT), Gnani Timbre v2.5 (TTS)
- Extraction: Gemini free tier or Cloudflare Workers AI free
- Map: MapLibre GL JS + OpenFreeMap
- Data: datameet/railways (CC0), data.gov.in timetable

## Team

| Name | Role | Gnani contribution to name in submission |
|------|------|-------------------------------------------|
| Bibi Sufiya Shariff | Product, speech pipeline, benchmark | Prisma STT integration, fusion logic, noise benchmark |
| Mohammed Ayaan Adil Ahmed | Frontend, 3D/motion, edge API | Timbre TTS integration, hero experience, leaderboard |

(Adjust the split if reality differs, but the submission must state each member's actual contribution.)

## Data and privacy

Synthetic or self-recorded audio only. Audio is processed in memory and never stored. No personal data collected. The Gnani API key lives only in Worker secrets.

## Licences

Code: MIT (proposed). Assets: see `docs/ASSETS.md` for per-asset licences (CC0, OFL, MIT, ISC, ITF Free).
