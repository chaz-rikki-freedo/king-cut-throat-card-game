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
| `node palette.js` | The colors against the registry, `docs/ui/palette.json`: every color is a registered token or on the untokenized list, no new collisions (also with color blindness simulated), and the contrast pairs. `--pack file.json` checks a theme pack. See [docs/ui/colors.md](../docs/ui/colors.md). No browser. | under 1 s |
| `node selftest.js` | The in-page self-tests (the same as **Self-tests: Run** in Settings → Tools), by area. The Interface area checks that every setting has a named row and every tab its pane, and builds every information popup the table can show at each step of 3 games, with Table memory off and on. | about 2 s |
| `node sw.js` | The service worker, with the worker running: a page that loads but is not the game (a network sign-in page) is not offered as an update, a real new version is (also one that changes only the theme packs), a page with an ad blocker's scripts still opens offline, another app's browser gets a note to open the game in Chrome, and the Install checklist gives up on a request that hangs. | about 6 s |
| `node forfeit.js` | Waves tries through the menu buttons and questions: leaving a game in hand 1 is free; from hand 2, **Discard** or **Play wave** counts one try and the question says so, also for a saved wave game while Free play runs; a cleared wave and a game the AI played in cost none. | about 7 s |
| `node scenarios.js` | The About screen (Menu, Rules, Settings, the build and the credit), then two full games through the real controls (Free play, then Waves wave 1): seat swap and log colors, reload and resume, the questions the app asks, end buttons, results, wave progress, replay codes, the Skip button in a Showdown between the two bots, an old save, and the Your seat setting (the AI seat never carries over). | 2–5 min |
| `node dynamic.js` | Dynamic mode through the controls: the menu card, the seat dialog and the header, a reload and Resume (the easing is worked out again from the moves), the end (results, the replay code with mode 3 and its META, the review and the profile, backups), **Replay Seed** (the same game from the old snapshot, after the review changed the profile), and a game where the AI played your seat (adds nothing). Also checks the fitted estimate in `index.html` against `data/handvalue-fit.json`. | about 30 s |
| `node backup-ui.js` | Your data through the real controls: **Save file** (a `.kct` file that holds the code, with the game in progress), the restore confirm (both sides, Cancel focused, a red **Replace all data**), Cancel (nothing changes), a restore (the page reloads with the backup's data), a file that is not a backup (a note, no confirm) and an older `.json` backup. | about 15 s |
| `node theme.js` | Theme through the real controls: the Felt tiles (the first setting in the Game tab), the Color-blind safe colors switch over a felt, the browser bar color, the theme kept and applied again by the head script on a reload, Classic bringing back every default, and an unknown saved theme falling back to Classic. | about 10 s |
| `node watch.js` | The replay viewer through the real controls: **Watch** at the end of a game, Previous hand, Back, Forward, Next hand (a redeal is the same hand) and Play, a discard raised before it goes, watching from West's and East's seats, the end result, Exit back to the results with the game and its log as they were, the Watch icon in Your profile and Escape, the `?replay=` link (used once; a bad code opens the menu with a note), and the controls on the table. | about 30 s |
| `node dynamic.js rates 80 4` | Not a default check. Bot games that measure Dynamic's fast path: how often it catches a player who throws away their best cards within 3 visible hands, and how often it fires for players at ladder rows 4, 6 and 8. Fails under an 80% catch rate or over 3% false alarms. | about 40 s |
| `node stress.js all 4` | Every stress section, with small sizes, in 4 pages at a time. | about 10 s |
| `node stress.js <section> <workers> '<json>'` | One stress section at full size (see below). | minutes |
| `node soak.js 4 5` | 4 pages × 5 full games at Instant speed. Random mode, sometimes the AI plays your seat, reloads at random points. | 5–30 min |
| `node roundrobin.js 4 4` | Not a check. Every table of three personalities plays 4 games (480 in all), with the seat orders rotating. Prints each bot's win rate, overall and per seat, as JSON. Results: [docs/banter.md](../docs/banter.md). | about 6 min |
| `node showdown.js shark 300 4` | Not a check. Bot games with the house rule **Mediator picks the Showdown lead** on, at a table of three Sharks (`shark`) or at Wave 15 with a Casual, Real table bot in seat 0 (`wave15`). Prints the trick splits, how often a hand ends in a Showdown, how often the Showdown leader wins, and each seat's game wins. Results: [docs/strategic-depth.md](../docs/strategic-depth.md). | about 7 min |
| `node namer.js 1500 4` | Not a check. What naming trump is worth, by round, seat and hand value. At every bid the hand is copied and played twice with the same deal, once with the player naming and once passing, and the difference in the player's points is printed with its margin. Also prints the points of the namer, the receiver and the third player, and the gift's value to the receiver. `fast` play (the default) or `shark` for full play-outs (slow). | about 1 min (`shark`: about 100 s for 60 deals) |
| `node handvalue.js 600 4` | Not a check. Three Shark bots play 600 games. Prints how well `AI.handValue` predicts the tricks and King points each hand wins, and fits new weights for its features. With `--write`, the fit replaces `data/handvalue-fit.json`. | about 10 min |
| `node levers.js <set> 300 4` | Not a check. Bot strength for a named set of settings: `dials` (each strength dial on its own), `ladder` (the rows of the Dynamic easing ladder) or `handvalue` (the fitted weights and the bid thresholds). Each setting plays 300 games in a rotating test seat. Prints win rate, 95% margin and score share. It serves a patched copy of `index.html` and does not change the file. | 5–25 min |
| `node habits.js 1 4` | Not a check. The habit report: every table of three personalities plays 1 game (120 in all) and `KCT.Habits` counts how each bot leads, follows, trumps in, throws off, plays its Kings and bids. Prints one column per bot and the spread (highest minus lowest bot): a small spread is a habit that all ten bots share. `--backup file.kct` (a Your data backup) or `--codes file.txt` (replay codes, one per line) adds your column. `--json` prints the counts too. | about 2 min |
| `node waves.js 150 4` | Not a check. Each wave's **Your win** again: a human-style bot (Casual, Real table) in your seat plays each wave 150 times. Prints the measured rate with its margin beside `youWin` in `WAVES`, and whether each wave is still at least as hard as the one before. `--json` prints the rates. | about 27 min |
| `node waves.js shark 60 4` | Not a check. The Shark run's **Your win** (`SHARK_WIN` in `index.html`): the same, for the eighteen tables with both bots at Shark skill, 60 games per table. | about 18 min |
| `node review.js 150 4` | Not a check. A player seat plays at rows of the easing ladder, and as a new player who throws away its best cards. Prints the time a post-game review takes, the review's signals per row, and how often the fast-path triggers fire. | about 5 min |
| `node pace.js 20 5 4 100,50,30` | Not a check. The pace of Dynamic's slow path: for each value of `PROFILE_HANDS` (the K in w = h / (h + K), now 50), players at four strengths play careers of Dynamic games from a blank profile, with the bots eased as in the app and the review between games. Prints the starting and mean easing per game, the hands until the easing reaches 0.3, and win rates. It serves a patched copy of `index.html` and does not change the file. | about 25 min |

The last four scripts measure the design of Dynamic mode. The results and the decisions they support are on issue #117.

`npm test` runs `typecheck.js`, `palette.js`, `selftest.js`, `sw.js`, `forfeit.js`, `scenarios.js`, `dynamic.js`, `watch.js`, `backup-ui.js`, `theme.js` and `stress.js all 4`.

GitHub Actions has two workflows:

- **Checks** (`.github/workflows/checks.yml`) runs the fast checks, `typecheck.js`, `selftest.js`, `sw.js`, `forfeit.js` and `stress.js all 4`, on each pull request and each push to `main`. It takes about a minute.
- **Tests** (`.github/workflows/test.yml`) runs `npm test` when a major release tag is pushed (`1.0.0`, `2.0.0`, `v3.0.0` and so on), or when you start it with **Run workflow** on the Actions tab.

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
- `page/drive.js`: page helpers for the UI scripts. Your seat is played by the fast AI, by clicks, once the table's motion has drawn the controls for the move.
- `page/stress.js`: the stress sections and the rules oracle.
- `page/handest.js`: the card features that `AI.handValue` weighs, and a hand estimate from any weights for them. `handvalue.js`, `levers.js` and `review.js` use it.
- `data/handvalue-fit.json`: the fitted hand-estimate weights, made by `handvalue.js --write`. Dynamic mode's reads and post-game review use them. The bots keep `AI.handValue`.
