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
| `node sw.js` | The service worker, with the worker running: a page that loads but is not the game (a network sign-in page) is not offered as an update, a real new version is (also one that changes only the theme packs), a page with an ad blocker's scripts still opens offline, another app's browser gets a note to open the game in Chrome, **Check again** in the Install checklist looks for a new version past the CDN and **Update now** loads it, and the Install checklist gives up on a request that hangs. | about 6 s |
| `node forfeit.js` | Waves tries through the menu buttons and questions: leaving a game in hand 1 is free; from hand 2, **Discard** or **Play wave** counts one try and the question says so, also for a saved wave game while Free play runs; a cleared wave and a game the AI played in cost none. | about 7 s |
| `node scenarios.js` | The About screen (Menu, Rules, Settings, the build and the credit), then two full games through the real controls (Free play, then Waves wave 1): seat swap and log colors, reload and resume, the questions the app asks, end buttons, results, wave progress, replay codes, the Skip button in a Showdown between the two bots, an old save, and the Your seat setting (the AI seat never carries over). | 2–5 min |
| `node dynamic.js` | Dynamic mode through the controls: the menu card, the seat dialog and the header, a reload and Resume (the easing is worked out again from the moves), the end (results, the replay code with mode 3 and its META, the review and the profile, backups), **Replay Seed** (the same game from the old snapshot, after the review changed the profile), and a game where the AI played your seat (adds nothing). Also checks the fitted estimate in `index.html` against `data/handvalue-fit.json`. | about 30 s |
| `node forced.js` | Forced plays: on, each forced card (your only legal card in a trick) plays itself; off, the game waits for you. The switch in the Human tag's popup changes the Settings row and is kept after a reload. | about 10 s |
| `node backup-ui.js` | Your data through the real controls: **Save file** (a `.kct` file that holds the code, with the game in progress), the restore confirm (both sides, Cancel focused, a red **Replace all data**), Cancel (nothing changes), a restore (the page reloads with the backup's data), a file that is not a backup (a note, no confirm) and an older `.json` backup. | about 15 s |
| `node resets.js` | Resets through the real controls: **Reset this tab** in the Bots and Table tabs (at once, progress stays), and each **Erase** choice in Tools → Your data (a mode's choice removes only that mode's data; **Everything + game files** deletes only the game's caches). Each asks first, on Cancel. | about 10 s |
| `node settings.js` | Every setting through the real controls: each Game setting is kept and a new game takes it (a running game keeps its rules, and the note says so), every value of every Bots control of every seat is applied, kept and counted, Who sits, Reset this seat and Bot defaults, the settings after a reload, and in Tools the Event log, Clear log and Self-tests. | about 40 s |
| `node restart.js` | A full restart: every setting changed and a Free play and a Waves game left mid-play, then the browser is closed and opened again on the same profile. Each setting comes back (the theme before the game draws, Settings on its last tab), both games resume at the same move with their seats, tunes and rules and play on, and Speed and AI can play your seat are back to their defaults. A second restart keeps defaults that were set back. | about 30 s |
| `node theme.js` | Theme through the real controls: the Felt tiles (in the Table tab, before its reset), the Color-blind safe colors switch over a felt, the browser bar color, the theme kept and applied again by the head script on a reload, Classic bringing back every default, and an unknown saved theme falling back to Classic. | about 10 s |
| `node watch.js` | The replay viewer through the real controls: **Watch** at the end of a game, Previous hand, Back, Forward, Next hand (a redeal is the same hand) and Play, a discard raised before it goes, watching from West's and East's seats, the end result, Exit back to the results with the game and its log as they were, the Watch icon in Your profile and Escape, the `?replay=` link (used once; a bad code opens the menu with a note), and the controls on the table. | about 30 s |
| `node dynamic.js rates 80 4` | Not a default check. Bot games that measure Dynamic's fast path: how often it catches a player who throws away their best cards within 3 visible hands, and how often it fires for players at ladder rows 4, 6 and 8. Fails under an 80% catch rate or over 3% false alarms. | about 40 s |
| `node stress.js all 4` | Every stress section, with small sizes, in 4 pages at a time. | about 10 s |
| `node stress.js <section> <workers> '<json>'` | One stress section at full size (see below). | minutes |
| `node soak.js 4 5` | 4 pages × 5 full games at Instant speed. Random mode, sometimes the AI plays your seat, reloads at random points. | 5–30 min |
| `node roundrobin.js 4 4` | Not a check. Every table of three personalities plays 4 games (480 in all), with the seat orders rotating. Prints each bot's win rate, overall and per seat, as JSON. Results: [docs/banter.md](../docs/banter.md). | about 6 min |
| `node showdown.js shark 300 4` | Not a check. Bot games with the house rule **Mediator picks the Showdown lead** on, at a table of three Sharks (`shark`) or at Wave 15 with a Casual, Real table bot in seat 0 (`wave15`). Prints the trick splits, how often a hand ends in a Showdown, how often the Showdown leader wins, and each seat's game wins. Results: [docs/strategic-depth.md](../docs/strategic-depth.md). | about 7 min |
| `node handvalue.js 600 4` | Not a check. Three Shark bots play 600 games. Prints how well `AI.handValue` predicts the tricks and King points each hand wins, and fits new weights for its features. With `--write`, the fit replaces `data/handvalue-fit.json`. | about 10 min |
| `node gamelength.js 600 4` | Not a check. How many hands a game takes, at four tables: three Sharks (`shark`), three Novices (`novice`), three Novices with 1 hunch, 90% brain farts and bold courage (`feeders`), and one Shark against two of those (`shark+feeders`, the Shark's seat rotates). A Joker redeal is the same hand. Prints the fewest, percentiles and most hands per game, the games of 5 hands or fewer, and the most points one player scored in one hand. A table name as the fourth argument runs only that table. | about 1 h |
| `node levers.js <set> 300 4` | Not a check. Bot strength for a named set of settings: `dials` (each strength dial on its own), `ladder` (the rows of the Dynamic easing ladder) or `handvalue` (the fitted weights and the bid thresholds). Each setting plays 300 games in a rotating test seat. Prints win rate, 95% margin and score share. It serves a patched copy of `index.html` and does not change the file. | 5–25 min |
| `node habits.js 1 4` | Not a check. The habit report: every table of three personalities plays 1 game (120 in all) and `KCT.Habits` counts how each bot leads, follows, trumps in, throws off, plays its Kings and bids. Prints one column per bot and the spread (highest minus lowest bot): a small spread is a habit that all ten bots share. `--backup file.kct` (a Your data backup) or `--codes file.txt` (replay codes, one per line) adds your column. `--json` prints the counts too. | about 2 min |
| `node waves.js 150 4` | Not a check. Each wave's **Your win** again: a human-style bot (Casual, Real table) in your seat plays each wave 150 times. Prints the measured rate with its margin beside `youWin` in `WAVES`, and whether each wave is still at least as hard as the one before. `--json` prints the rates. | about 27 min |
| `node waves.js shark 60 4` | Not a check. The Shark run's **Your win** (`SHARK_WIN` in `index.html`): the same, for the eighteen tables with both bots at Shark skill, 60 games per table. | about 18 min |
| `node review.js 150 4` | Not a check. A player seat plays at rows of the easing ladder, and as a new player who throws away its best cards. Prints the time a post-game review takes, the review's signals per row, and how often the fast-path triggers fire. | about 5 min |
| `node pace.js 20 5 4 100,50,30` | Not a check. The pace of Dynamic's slow path: for each value of `PROFILE_HANDS` (the K in w = h / (h + K), now 50), players at four strengths play careers of Dynamic games from a blank profile, with the bots eased as in the app and the review between games. Prints the starting and mean easing per game, the hands until the easing reaches 0.3, and win rates. It serves a patched copy of `index.html` and does not change the file. | about 25 min |
| `node career.js 12 4 80:0,80:80` | Not a check. A career of 82 Dynamic games from a blank profile for a player who starts bad (8 bad games, then 24 that are bad half the time, then 50 okay ones), for each setting `hold:taper` (`HOLD_HANDS`:`TAPER_HANDS`): `0:0` is neither, `80:0` a hold that ends at once, `80:80` the build. `--gross` makes a bad player throw away its best cards at 40% of its first discards. Prints, per phase, the easing, Sharks at the table and win rates, and for the first 8 games the wins per career and the loss streaks. It serves a patched copy of `index.html` and does not change the file. | about 25 min for 16 careers |
| `node tally.js 300 4` | Not a check. How well `Tally` (the fitted strength of what each seat was dealt) predicts the points a seat scores: 300 bot games, then r, R2 and the slope of a seat-hand's points against its kept value (pooled and within the hand), the mean points by strength, and a seat's share of the table's strength against its share of the points. | about 3 min |
| `node awards.js 300 4` | Not a check. Fits and checks the award bands (`Awards`): 300 bot games, every seat graded, then the time to grade a seat, the `EDGES` that the fit gives (copy them into `index.html` when they move), the share of seat-games in each band against the target (5, 12, 20, 26, 20, 12 and 5%), the cost and win rate by tier, the cost against winning, and one replay code per band, graded for seat 0. A third argument sets the first seed, for a fresh sample. | about 4 min |

The last five scripts measure the design of Dynamic mode. The results and the decisions they support are on issue #117.

`npm test` runs `typecheck.js`, `palette.js`, `selftest.js`, `sw.js`, `forfeit.js`, `scenarios.js`, `dynamic.js`, `watch.js`, `forced.js`, `backup-ui.js`, `theme.js`, `resets.js`, `settings.js`, `restart.js` and `stress.js all 4`.

GitHub Actions has two workflows:

- **Checks** (`.github/workflows/checks.yml`) runs the fast checks, `typecheck.js`, `selftest.js`, `sw.js`, `forfeit.js` and `stress.js all 4`, on each pull request and each push to `main`. It takes about a minute.
- **Tests** (`.github/workflows/test.yml`) runs `npm test` when a major release tag is pushed (`1.0.0`, `2.0.0`, `v3.0.0` and so on), or when you start it with **Run workflow** on the Actions tab.

## Dev commands

For manual testing, type a dev command in **Menu → Load a code** and press Enter. A dev command changes a cap that doesn't affect a game: no rule, deal, bot or progress. The exceptions are `!dev easing` and `!dev easing=N` (see below).

The field gives no hint of dev commands: it reads nothing while you type, and other text that starts with `!` reads as not a code. Only Enter (or **Load**) on a `!dev` command runs it: a valid command applies at once and returns to the home card, `!dev` alone shows the keys, and a bad key or value shows the reason.

```
!dev saves=40 log=300     set one or more caps
!dev                      list the caps in use and their defaults
!dev reset                go back to the defaults
!dev easing               Dynamic's easing readout (legend below)
!dev easing=0             set Dynamic's profile to 0 hands (asks first)
!dev awards=on            show the award on the game-over box (awards=off hides it)
```

| Key | Default | Range | What it sets |
|---|---|---|---|
| `saves` | 20 | 1–1000 | Replays kept per mode (`REPLAYS_MAX`) |
| `log` | 1500 | 10–100000 | Latest Scroll lines that a save keeps (`LOG_SAVE_MAX`) |
| `scroll` | 5000 | 10–100000 | Latest Scroll lines shown (`LOG_MAX`) |
| `logger` | 1500 | 10–100000 | Event log lines kept (`LOGGER_MAX`) |

- Overrides last until the tab closes (`sessionStorage`, key `kct-dev`). They're never in a backup.
- A lower cap trims at the next write: older replays or lines are removed for good. There's no preview, so check the value before you press Enter.
- While an override is set, the About card shows **DEV** and the values after the build.
- Self-tests always run with the defaults.
- `!dev easing` shows a readout of Dynamic's easing, for when a player says Dynamic is too easy or too hard. It's written in codes so the player can't read it; the legend is below. It changes nothing. A player can type the word `pulse` instead (any case, then Enter or **Load**): it shows the same readout, with no dev command. Typed, it reads as text that is not a code, like `!dev`.
- `!dev easing=N` (N from 0 to 9999999) asks first, then sets the hand count of Dynamic's profile (`kct.profile`) to N and clears the gross-mistake mark. The hand count places you in the hold and the taper: below 80 (`HOLD_HANDS`), full easing until hand 80; from 80 to 160 (`TAPER_HANDS`), the taper; 160 or more, the record alone. The question says which applies. Everything else stays: the record of your play, the habit counts in **Your profile**, Dynamic's saved game (which keeps the easing it started with), results and replay codes, the other modes and the settings. Unlike the caps, the change is kept after the tab closes, and there's no undo. The menu says **Dynamic's easing is set to N hands.** **Cancel** changes nothing. Write it on its own: `!dev easing=0 saves=40` is refused.
- `!dev awards=on` shows the award on the game-over box: how well your seat chose with the cards it was dealt, never its score. Once it's worked out (about 0.2 seconds), a heavy stroke fades in, in one of 7 colors: neon green (band 6, the best) through yellow (band 3) to neon red (band 0, the worst). It grades your seat whoever played it, the AI included, in every mode. The stroke is all a player sees: no words, numbers or hover text. For the numbers, turn on **Settings → Tools → Event log**: each award writes an `AWARD` line with the band, the mean cost and each part. In the replay viewer (**Load a code**), the box opens at the last move of a finished game, and **Back** returns to the viewer, so a replay code shows its award. `!dev awards=off` hides it. It's off for a new install and is kept on the device until changed (`localStorage`, key `kct-awards`, never in a backup). While it's on, the About card shows **DEV awards**. Write it on its own. [data/award-codes.txt](data/award-codes.txt) has a code for each band. See [human-play.md](../docs/human-play.md#awards-how-you-did-with-your-cards-2026-10-31) for the grade.
- Input that starts with `!` is reserved for dev commands, so it never collides with a code (see [replay-code.md](../docs/replay-code.md)). To add a key, add it to `DEV_KEYS` in `index.html` and read it with `Dev.num()`.

### Dynamic readout (`!dev easing`)

Ask the player to type `pulse` in **Menu → Load a code**, press Enter, and send you a screenshot. (`!dev easing` shows the same.) All numbers marked % are 0 to 100.

```
P h214R f00 t12 n12 k2 m0
S sh31 fc44 be06 sl02 w81
B p+0.1 b+0.3 n24
G h3 s12 e09 t00 F0 v0/1
L W12 L08 L08 A08 W15
```

| Line | Code | Meaning |
|---|---|---|
| **P** (profile) | `h214R` | Hands on record, then the phase: `H` hold (under 80), `T` taper (80 to 159), `R` the record alone (160 or more). |
| | `f` | The floor that the hold and taper set, % |
| | `t` | The slow path's target from the record, % |
| | `n` | The next new game's starting easing, % (the larger of `f` and `t`, or 100 when `m1`) |
| | `k` | Sharks allowed at the next new table: 0, 1 or 2 |
| | `m` | The gross-mistake mark: `1` means the last reviewed game had a discard window, so the next game starts at 100 |
| **S** (signals) | `sh` | Score share in Dynamic, %. An even share is 33; the easing grows below 33 and is full at 20. |
| | `fc` | Failed calls, %. Normal is about 45. `--` means no calls yet. |
| | `be` | Bid errors, % |
| | `sl` | Card-play slips, %. The Casual bots slip about 2%. |
| | `w` | How much the record counts, % (hands / (hands + 50)) |
| **B** (bad hands) | `p` | Your net points per weak hand: a hand whose best 7 dealt cards are worth less than 3.0 on the fitted scale (`BAD_HAND`). Points lost count against it. A player is dealt about one a game. |
| | `b` | The same for the bots at your tables, as a yardstick |
| | `n` | Your weak hands on record. Under about 20 (about 23 games), `p` is noise. `B --` means none yet. |
| **G** (game at the table; only during a Dynamic game) | `h` `s` `e` `t` | Hands played this game, starting easing, easing now, and its target, % |
| | `F` | The fast path: `1` means it holds (weak kept hands, 2 of the last 3 visible) |
| | `v` | Weak visible hands / visible hands this game |
| **L** (last 5 Dynamic games, newest first) | `W` `L` `A` | Won, lost, or the AI played the player's seat. The digits are that game's starting easing, % (`--` when unreadable). |

The signals are decayed: they follow about the last 100 samples. Reading a complaint:

- **"Too hard"** with `n` low and `sh` near 33: the record says the player is even, and the game plays at strength. `sh` well under 33 with `n` still low means the record is young (`w` low) or the player only just got worse. `!dev easing=0` starts the hold again.
- **"Too hard" and the B line:** in 80 bot games each, a seat that plays like the bots scored +0.27 per weak hand against the bots' +0.29, and a floor-strength seat +0.26 against +0.33. A `p` near or below 0 with `b` positive means the player loses points on bad hands. A `b` well above +0.3 (+0.45 or more) means the bots profit from the player's hands: a seat that called every hand it could gave the bots +0.46. The margin is about ±0.12 at 70 hands, so read a gap only when it is larger than that. Games from every mode count.
- **"Too easy"** with `n` high: check `m1` (one bad game sets it; it clears after the next game) and the phase (`H` or `T`: the hold or taper sets the floor). `!dev easing=160` ends the hold and taper.

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
