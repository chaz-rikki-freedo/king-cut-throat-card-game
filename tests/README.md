# Tests

Browser tests for `index.html`. Each script serves the repository on a local port, opens the page in Chromium with Playwright, and exits with code 1 when a check fails.

## Set up

```sh
cd tests
npm install            # installs Playwright and TypeScript
npx playwright install chromium
```

If Playwright is already on the machine, skip `npm install` and set `NODE_PATH` to its `node_modules` folder. If Playwright has no browser of its own, set `PW_CHROMIUM` to the Chromium program file.

## Scripts

| Script | What it checks | Time |
|---|---|---|
| `node typecheck.js` | The TypeScript checker on the game script in `index.html`, so the JSDoc types are checked. No browser. | about 3 s |
| `node selftest.js` | The in-page self-tests (the same as **Run self-tests** in Settings). | about 2 s |
| `node scenarios.js` | Two full games through the real controls (Free play, then Waves wave 1): seat swap and log colors, reload and resume, the questions the app asks, end buttons, results, wave progress, replay codes, the Skip button in a Showdown between the two bots, an old save, and the Your seat setting (the AI seat never carries over). | 2–5 min |
| `node stress.js all 4` | Every stress section, with small sizes, in 4 pages at a time. | about 10 s |
| `node stress.js <section> <workers> '<json>'` | One stress section at full size (see below). | minutes |
| `node soak.js 4 5` | 4 pages × 5 full games at Instant speed. Random mode, sometimes the AI plays your seat, reloads at random points. | 5–30 min |

`npm test` runs `typecheck.js`, `selftest.js`, `scenarios.js` and `stress.js all 4`. GitHub Actions runs `npm test` only when a major release tag is pushed (`1.0.0`, `2.0.0`, `v3.0.0` and so on), or when you start it with **Run workflow** on the Actions tab (`.github/workflows/test.yml`).

## Stress sections

The page code is `page/stress.js`. Each page is one shard, with its own seeds, so a failure names a seed that you can replay.

| Section | What it does | Full-size example |
|---|---|---|
| `engine` | Plays games with random moves, AI moves or both. After every step it checks card conservation, scores, hand sizes, turn order and other invariants. It compares legal plays, trick winners, King points, hand points, Showdowns and the 0 floor with an **oracle**: the rules written again from the README, with no code from `Rules` or `Engine`. At random steps it sends invalid actions and checks that the Engine refuses each one and leaves the state unchanged. Some games are also replayed (the state must be the same), sought to random steps forwards and backwards, and saved: a real save must load, and a save with any one field changed must be dropped. | `node stress.js engine 8 '{"games":2000,"fuzz":0.25,"replayEvery":4}'` |
| `replayFuzz` | Damaged and random replay codes. Decode and replay must give an error or a result, never a crash. | `node stress.js replayFuzz 8 '{"tries":25000}'` |
| `recordFuzz` | Replay records with holes, junk and wrong types. `Replay.run` must never throw. | `node stress.js recordFuzz 8 '{"tries":10000}'` |
| `backup` | Backup round trips (file, gzip code, plain code), an import that fails on any key (the old data must stay), and damaged files and codes. | `node stress.js backup 8 '{"n":250}'` |
| `ai` | AI decisions with every personality and other settings at random game states: each decision must be legal, and must not change when the cards that the seat cannot see are moved. | `node stress.js ai 8 '{"n":500}'` |

## Files

- `lib/browser.js`: the local server and the browser helpers.
- `page/drive.js`: page helpers for the UI scripts. Your seat is played by the fast AI, by clicks.
- `page/stress.js`: the stress sections and the rules oracle.
