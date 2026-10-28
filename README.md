<img src="assets/icon.svg" width="64" height="64" alt="">

# Sonar

Classic Battleship, strictly 1v1 — with friends (private room links) or strangers (Quick Match). No accounts. Lives at [sonar.saeed.sh](https://sonar.saeed.sh).

## Layout

| Path            | What                                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `packages/game` | Rules, Effect Schema wire protocol, and the `HttpApi` contract shared by client and server                             |
| `apps/worker`   | One Cloudflare Worker: `Room` + `Matchmaker` Durable Objects (PartyServer), `/api` via Effect `HttpApi`, D1 migrations |
| `apps/web`      | React SPA: TanStack Router, Effect Atom, Tailwind v4 + shadcn/ui; served as the Worker's static assets                 |

## Develop

```sh
vp install
vp run @sonar/worker#db:migrate:local   # once, and after adding a migration
vp run dev                              # SPA + Worker + DOs + D1 in one Vite server
```

| Command                      | Does                                                                    |
| ---------------------------- | ----------------------------------------------------------------------- |
| `vp check`                   | Format, lint, and type-check everything                                 |
| `vp run -r test`             | Unit/property tests (`game`) and Worker tests inside workerd (`worker`) |
| `vp run web#e2e`             | Playwright against the dev server, desktop + phone                      |
| `vp run web#build`           | Production build of SPA + Worker                                        |
| `vp run @sonar/worker#types` | Regenerate `Env` types after editing `wrangler.jsonc`                   |

## Sound

Effects are generated with the ElevenLabs Sound Effects API from the prompts in `apps/web/sfx/prompts.json`; raw takes live in `apps/web/sfx/takes/`, the chosen take per cue in `apps/web/sfx/picks.json`.

```sh
ELEVENLABS_API_KEY=... vp run @sonar/web#sfx:generate [cue ...]   # fill missing takes
vp run @sonar/web#sfx:encode                                     # picks → public/sfx (.webm + .m4a)
```

With the dev server running, `/dev/sounds` auditions every take and re-encodes when you choose one.

## Deploy

Infrastructure lives in `sst.config.ts` (SST v4, state kept in Cloudflare): the Worker with the SPA as its static assets, the `Room` and `Matchmaker` Durable Objects, D1 (migrations applied on every deploy that changes them), and `sonar.saeed.sh` on the `production` stage.

```sh
vp exec sst install                               # once, fetches providers and types
vp run web#build && vp exec sst deploy            # your personal stage
vp run deploy                                     # production
```

`apps/worker/wrangler.jsonc` only drives local dev and Worker tests — keep its bindings in sync with `sst.config.ts`.

CI (`.github/workflows/ci.yml`) checks every push and PR, deploys each PR to its own `pr-<n>` stage (removed when the PR closes), and deploys `main` to `production`. It needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_DEFAULT_ACCOUNT_ID` repository secrets.
