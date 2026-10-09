# King Cut-Throat

A browser game in one file, `index.html`. Open it in a browser to play, or install it as an app (see **Install and offline play**). This file covers the menu, waves, saved games, the app files and the settings panel.

## Menu

Each launch opens on the menu. To open it during a game, click **☰** in the header (the game waits).

The menu has a card for each mode, **Free play** and **Waves**, and a row of tools. Each card shows its game in two lines (who, then the hand and the scores), or **No saved game**. Every button stays in the same place whatever is saved or running.

| Item | What it does |
|---|---|
| **Resume** (in each card) | Continues that mode's game: the one you are playing (the menu closes), or the saved one. Disabled when there is none. At launch, the last game played is the main button. |
| **New game** (Free play) | The seed picks two random opponents. If an unfinished Free play game has begun, the app asks first. |
| **Play wave** (Waves) | Starts the wave chosen in the list (the highest open wave by default). A ✓ marks a cleared wave. If an unfinished Waves game has begun, the app asks first. |
| **Rules** | The quick rules. **Back** returns to the menu. |
| **Tutorial** | Coming soon (disabled). |
| **Install** | Shown when the browser offers it: play from your home screen, also offline. |
| **Close** | Closes the menu. At launch, the table stays empty: the menu, Settings and the profiles work, and **Choose a game** opens the menu. |

A link with `?seed=` or `?wave=` starts that game at once, without the menu.

## Header

The header stays at the top of the window, and the page scrolls under it. From left to right:

- **☰** opens the menu (games and Rules).
- The title (hidden on narrow phones) and the mode: **Wave N of 18** or **Free play**. The mode is a button that opens your results for that mode (see **Results pop-up**). With no game, the mode is not shown.
- The trump suit and the hand and trick number. Below 900 px, these move to a second row.
- The **speed** menu (Slow, Normal, Fast, Instant).
- **Settings** (the sliders icon).

### Free play: choose seats

In Free play only, after the deal and before anyone discards in hand 1, a dialog shows your two opponents: West (your left) and East (your right). **⇄** swaps them and **Play** starts the discard. This is the only chance to swap. **Replay Seed** offers it again. There is no dialog when the AI plays your seat at the start.

## Saved games, settings and results

The app keeps these in the browser (`localStorage`), so a closed tab loses nothing:

- **One unfinished game per mode** (`kct.slots`), saved after every action, with its Latest Scroll (last 1500 lines). Starting a new game in a mode replaces that mode's game; the menu asks first if it has begun. A finished game is not kept.
- **Wave progress** (`kct.waves`): open waves, cleared waves and tries per wave.
- **Settings** (`kct.settings`): Personalities, skill, bid courage, Real table, AI thinking and knowledge, Logging, and your seat's AI personality. Speed and the Your seat switch are not kept: each load starts at Normal, with the switch off.
- **Results** (`kct.stats`): played and won, per mode, per table (West/East), per opponent, and per opponent in each mode. A game where the AI played your seat adds no results.

- **Replay codes** (`kct.replays`): the last 20 finished games (see **Replay a game**).

If the browser refuses to save any of these (storage full or blocked), a note says so once per page load. The data then lasts until the page closes.

**Backup.** One backup holds all of this, also a game in progress: as a `.json` file or as a text code (`KCTS1-…`) to copy to another device. An import replaces all the data on the device, with no undo. There is no UI yet; see **Console** and [docs/backup.md](docs/backup.md).

If a new version cannot load a saved game, the game is dropped and the menu says so once. Wave progress and results are kept. Change `SAVE_FORMAT` in `index.html` when the Engine state changes shape.

The app does not trust saved data, because a backup can come from another person. At each load, it rebuilds a saved game from its seed and its moves. If the result is not the same as the saved game, the app drops the game. A game saved before the app kept the moves cannot be rebuilt, so the app drops it too. The Latest Scroll is saved as text, not as HTML. Results keep only counts that make sense.

## Results pop-up

Click the mode in the header.

- **Waves: Wave tries.** Newest wave first. Each wave, its two opponents and your tries. A try is a game that counts for the wave (see **Waves**). For a cleared wave (✓), the tries are the games it took to clear it, and the number does not change after that. For the open wave that is not cleared, the tries are the games so far. Locked waves are not listed, so their opponents stay a surprise: a line says how many more waves there are. The current wave is highlighted.
- **Free play: Free play wins.** For each of the ten bots: the Free play games you won and played with that bot at the table. Waves games do not count here.
- Progress saved before tries were kept gets a random number of tries, 1 to 4, for each cleared wave. Free play wins count from this version on.

## Settings panel

Click **Settings** (the sliders icon) in the header, or add `?settings=1` to the URL (this opens the Tools tab and turns on the event log). Settings fills the screen and has four tabs: **Game**, **Bots**, **Expert** and **Tools**. Each setting is one row: its name and a one-line description, then its control. On/off settings are switches; a click anywhere on the row toggles one. **✕** or **Esc** closes Settings, and the arrow keys move between the tabs. The tab you used last opens next time. While Settings is open, the page behind it cannot be clicked or reached with Tab. A setting that does not apply at the moment is dimmed and cannot be changed, by click or keyboard.

### Game: Table

| Setting | What it does |
|---|---|
| **Advanced UI** | Off by default. A minimal table for players who know the rules. See **Advanced UI** below. |
| **Table memory** | Off by default. Shows what every player at the table has seen this hand, never a card someone holds unseen. In the Advanced UI, every strip cell, seat tag, score and hand of backs opens a popup that explains it; with this on, the popups add the trumps and Kings played and not seen yet and where the turned card went. In the standard table, a seated player's profile adds a **This hand** box with the same bids and voids. |

Both settings are kept after a reload. **Defaults** (Bots tab) does not change them.

### Game: House rules

| Setting | What it does |
|---|---|
| **Mediator picks the Showdown lead** | On by default. After the Showdown discards, the mediator picks which Showdown player leads the first trick. A bot mediator picks by its personality (see **Opponents**). Off: the Showdown player who won the latest main trick leads. A game keeps the rule it started with: a change applies from your next game, and the Settings panel and the Showdown summary say so while the running game differs. |

The setting is kept after a reload. A change applies from your next game: a game keeps the rules it started with, so its replay code gives the same game.

### Game: Your seat

**AI can play your seat** (off by default): on, the **HUMAN** tag on your seat works (see **AI plays your seat**). Off, the tag is a label only, so a stray click cannot hand over your seat. Turning it off while the AI has your seat gives you the seat back at once. Like speed, the switch is for this page load only: a reload turns it off, and it is not in the settings, a backup or a replay code.

**AI personality** (default **From the seed**): the personality the AI uses when it plays your seat. It can be changed only while **AI can play your seat** is on, and not once the AI has taken your seat in the running game (the game keeps that personality; the row says which). If you choose one that already sits West or East, or with **From the seed**, the seed picks one that is not at the table. The game keeps this setting after a reload.

### Bots

All bot settings apply to all bots and are kept after a reload. **Defaults: Reset**, at the bottom of the tab, resets them all, with the Expert tab. In a Waves game, **Personalities** and the bot settings are dimmed: a wave always uses its personalities. The switch keeps its value for Free play.

| Setting | What it does |
|---|---|
| **Skill** | Sets AI thinking and AI knowledge together (the Expert tab). Shows **Custom** when you change them there. |
| **Bid courage** | How readily the bots call trump in both bidding rounds. |
| **Real table** | The bots play like a typical human table (see below). |

Skill tiers, weakest first:

| Tier | Hunches | Brain farts | Knowledge on |
|---|---|---|---|
| **Novice** | 3 | 60% | none |
| **Casual** (default) | 10 | 30% | Watches score |
| **Club player** | 20 | 10% | Spots voids, Remembers discards, Plans showdowns, Watches score |
| **Shark** | 40 | 0% | all |

Stronger tiers think longer before each move.

Bid courage: **Timid**, **Cautious**, **Normal** (default), **Bold**. When a bot plans a bid, courage adds a fixed amount to the win chance of a call: −10%, −5%, 0, +5%. When a bot bids by rule (Real table, and the bots' model of the other seats), courage changes the hand value needed to call: +1.0, +0.5, 0, −0.4. In a test of 15 Casual games, the bots passed 72%, 64%, 61% and 48% of their bids.

**Real table** (off by default):

- The bots pass more in both bidding rounds. They need 0.5 more hand value before they call trump (added to bid courage), and they bid by this rule instead of planning the bid.
- In the first discard, they pitch their lowest cards. Jacks and the Joker stay. On equal rank, the card from the shorter suit goes first.
- When the bots read bids and play hands out in their heads, they expect the other seats to play the same way.

On, the bots are weaker.

### Expert: AI thinking and knowledge

These fine-tune **Skill** for every bot. With **Personalities** on, or in a Waves game, they are dimmed and do not apply.

**AI thinking.** Both settings change how long the bots think.

- **Hunches** (1–200, default 10): how many guesses about the hidden cards the bots make for each decision. Fewer hunches make them sloppier. More than 40 adds no measured strength.
- **Brain farts** (0–100%, default 30%): how often the bots imagine a random card when they replay a hand in their heads. More brain farts make them judge moves less well. 0% is the strongest setting.

**AI knowledge.** Each switch turns one kind of knowledge on or off. All on, with 40 hunches and 0% brain farts (Shark), is the strongest AI. The switches are listed by measured effect on bot strength, largest first.

| Switch | Off means the bots… |
|---|---|
| **Spots voids** | ignore which suits each player is out of |
| **Remembers discards** | forget the cards they put in the outside pile |
| **Plans showdowns** | always try to take tricks |
| **Reads bids** | treat bids as meaningless |
| **Watches score** | play for points only. On, the bots watch the race to 10 more and more as the leading score passes 5 (6: 25%, 7: 50%, 8: 75%, 9: 100%). |
| **Tracks upcard** | lose track of the turned card after the bidding |

### Tools

| Control | What it does |
|---|---|
| **Event log** | Starts the timestamped event log (public information only), shown below it. |
| **Seed / Copy** | Shows the current game's seed and copies it. |
| **Install** | What this browser needs to install the app: secure page, manifest, icons, service worker, whether the storage is persistent, and whether the browser offers an install. **Install app** shows when it does (also in the menu). **Check again** runs the check again. |
| **Self-tests: Run** | Runs the built-in tests one area at a time, so the page stays usable, and shows a summary by area, with any failures listed. |
| **Clear log** | Clears the log and the test results. |

## King points

Each time a King wins a trick, a large green **+1** appears at the center of the screen, over everything. It is tilted at random (up to 15° either way), has a green stroke and a weathered, chipped finish, and fades from green (80% opaque) at the top to clear at the bottom. It hangs for a moment. Your own +1 then drops and dissolves; a bot's flies into that bot's seat and shrinks into its score, so you can see who scored. The bot's score changes, with a flash, when the +1 lands. A seat scrolled out of view: the +1 goes to the window's edge on that side. It shows every time, in both tables, and lasts longer at slower speeds.

## Advanced UI

Settings → Game → **Advanced UI**. The same game, drawn as a minimal table with no instructions. The game still enforces every rule: cards you cannot play stay dimmed, and a confirm button waits for enough cards.

- **Seats.** The name, the score as a number, and tags in one fixed order as they come up: **Human** or **AI**, **Dealer**, **Namer**, **Kitty**, **Turn**, **Led**, then **Mediator** (**MED** on phones) or **SD** (Showdown). A bot's hand shows as small backs. Circles fill as tricks are won: 7 in a hand; a Showdown player counts Showdown tricks (5). Click the circles to see the cards of each trick that player won this hand: one column per player, headed by their name and starting with that player, with the card that led the trick ringed. During a Showdown, a Showdown player's list shows their Showdown tricks.
- **Information strip** (the bottom row of the header, so it stays in view when you scroll): **Trump**, **Hand** and the trick number (outside trick play, the stage of the hand: Discard, Bidding, Exchange, Result or Showdown), the **Latest** line (see below), **Turned up** (**Blocked** in round 2) and **Outside** (the outside pile's count; in a Showdown, a small card per discard, yours face up). Click **Outside** to see what the pile is and the cards you put in it.
- **Play area.** Before the first trick, the kitty lies spread so you can count it, with the turned card face up on top. During the discard, the kitty lies beside the outside pile. The trick is in 3D: each bot card faces your space, the cards stack in play order, and the winning card lifts with a white edge. Every **King** has a **KING** tag. All action buttons sit at the bottom of the play area; round 2 names a suit with its symbol. **Skip** moves to the header.
- **Information popups.** Click any strip cell (**Trump**, **Hand**, **Turned up**, **Outside**), any seat tag, a score or a hand of backs to see what it means: the trump order, who dealt and who leads, what the turned card did, a player's points this game and this hand, and so on. **Table memory** (Settings → Game) adds the counts a careful player keeps: trumps and Kings played and still out, where the turned card went. A bot's hand of backs shows only **Void of** and the suits it has shown void in (could not follow suit). A bot's profile (tap its figure) stays about who it is. A popup opens under what you clicked, or above it when it would not fit, and always inside the window.
- **Latest line and Latest Scroll.** The Advanced UI has no toasts and no side panel. Each new line of the Latest Scroll drops in from above the window, exactly the size of the Latest cell, and becomes the Latest line (at most two lines; trick headings are left out). When one move adds several lines (an accept and the kitty card it moves, a trick's winner and a King point), they show together, at most two, so the first stays readable; a card played is left out then, since it is on the table. When lines come faster than they can fall, the newest wins: a line still falling lands at once. Click the Latest cell (**▾**) to open the Latest Scroll under the strip, about six lines high; it pushes the table down. Newest first: each group keeps its heading on top. Click the cell again (**▴**) or press **Esc** to close it. A note from the app, such as a refused save, drops in the same way but is not added to the scroll.
- **Motion** shows each move: the deal goes round the table from the dealer's left in packets, as at a real table (3 to each player, 3 to the kitty, 4 to each, then 3 to each), the discards slide onto the outside pile (no one discards before the deal ends), the dealer turns up the top kitty card, the kitty splits to the receiver and the outside pile when trump is set, each trick card comes from its player's seat, and the trick sweeps to the winner's circles. A thrown-in hand (all pass, or the Joker turned up) goes back to the dealer before the new deal. The Outside count and the circles change when the cards arrive. A card never flies off screen: when its target is out of view, it goes to the window's edge on that side. Motion follows the game speed; **Instant**, or the system setting to reduce motion, turns it off.

## Opponents

Ten named bots: Vex, Doc, Ace, Mei, Gus, Lou, Viv, Tex, Kit and Zen. Each game seats two of them, West and East. The seed picks them, so a replay meets the same two.

- Each bot has its own color. The name has that color on the board, and the log shows it as a colored tag. You are teal.
- Tap a bot's figure to see its profile: a quote, a hint, and two bars. **Card sense** and **Nerve** go up to 4. **Set in their ways** marks a bot with human habits.
- **Personalities** (Settings → Bots, on by default): each bot plays its own skill tier, bid courage, Real table setting and Showdown pick. Off: every bot plays with the Bots and Advanced settings. For a personality, bid courage alone sets how loose it bids; Real table does not add its extra 0.5.

| Bot | Skill | Bid courage | Real table | Showdown pick |
|---|---|---|---|---|
| Vex | Shark | Bold | | Impulsive |
| Doc | Shark | Cautious | | Shrewd |
| Ace | Club player | Bold | | Fair |
| Mei | Shark | Normal | | Shrewd |
| Gus | Casual | Bold | on | Impulsive |
| Lou | Novice | Timid | | Fair |
| Viv | Club player | Cautious | | Shrewd |
| Tex | Novice | Bold | | Impulsive |
| Kit | Novice | Cautious | on | Fair |
| Zen | Casual | Normal | on | Fair |

**Showdown pick** is how a bot picks the Showdown leader when it mediates (house rule, Settings → Game):

- **Shrewd**: the Showdown player with the lower score leads, which works against the player closer to 10. On equal scores, as Fair.
- **Fair**: the Showdown player who won the latest main trick leads, as without the house rule.
- **Impulsive**: a random Showdown player leads.

With Personalities off, a bot picks as Shrewd when **Watches score** is on, and as Fair when it is off.

## Waves

Eighteen fixed tables, easiest first. Each wave seats two personalities, West and East. Start a wave from the menu, the URL or the console.

- The seat order is part of the wave. East gives you the trump gift when East calls, so a bold bot is easier on your right (East) than on your left (West).
- A wave always uses its personalities, also when **Personalities** is off.
- A win clears the wave. A win on the highest open wave opens the next one. A loss changes nothing except the tries.
- Each counted game on a wave that is not cleared yet adds one try. Click **Wave N of 18** in the header to see your tries.
- A win does not count when the wave was locked at the start, or when the AI played your seat at any time in the game. The first time you hand your seat to the AI in a wave that can still be cleared, the game asks first.
- A win with **Replay Seed** counts too.
- At the end of a wave: after a win, **Next wave**, **Replay Seed** and **Menu**; after a loss, **Try again** (same wave, new deal), **Replay Seed** and **Menu**.
- Progress is kept in the browser (`localStorage`, key `kct.waves`). Without storage, it lasts until the page reloads.

**Your win** is the win rate of a human-style bot (Casual, Real table) in your seat, from 150 bot games per table. A real first-time player wins less. A rematch is an earlier wave with the seats swapped.

| Wave | West | East | Your win | Rematch of |
|---|---|---|---|---|
| 1 | Kit | Tex | 61% | |
| 2 | Kit | Gus | 51% | |
| 3 | Zen | Tex | 51% | |
| 4 | Lou | Gus | 49% | |
| 5 | Lou | Zen | 47% | |
| 6 | Viv | Tex | 47% | |
| 7 | Kit | Zen | 46% | |
| 8 | Mei | Tex | 40% | |
| 9 | Kit | Ace | 37% | |
| 10 | Viv | Gus | 37% | |
| 11 | Lou | Vex | 35% | |
| 12 | Doc | Ace | 29% | |
| 13 | Tex | Mei | 24% | 8 |
| 14 | Ace | Doc | 21% | 12 |
| 15 | Vex | Lou | 18% | 11 |
| 16 | Tex | Viv | 18% | 6 |
| 17 | Mei | Doc | 12% | |
| 18 | Vex | Doc | 7% | |

Start a wave: `index.html?wave=3` (add `&seed=123` to fix the deals too).

```js
KCT.App.newGame(undefined, 3)      // play wave 3 with a new seed
KCT.Waves.progress()               // { unlocked, cleared, tries, total, complete }
KCT.Waves.isUnlocked(5)
KCT.Waves.tries(5)                 // games it took to clear wave 5 (or games so far)
KCT.Waves.unlockAll()              // open every wave (for testing)
KCT.Waves.reset()                  // back to wave 1
KCT.WAVES                          // the table above, with a purpose line for each wave
KCT.App.app.wave                   // { n, open, result } for the current game
KCT.App.stats.get()                // results per mode, table and opponent
KCT.App.slots.get('free')          // the saved Free play game, or null
```

## AI plays your seat

Turn on **Settings → Game → AI can play your seat**, then click the **HUMAN** tag on your seat. It changes to **AI**, and the AI plays for you, with only your seat's information. Click the tag again to take your seat back. The first time, your seat gets the personality from **Settings → Game → AI personality**, or one that the seed picks (see **Your seat**). It keeps that personality for the rest of the game, however often you switch. With Personalities off, in Free play, the AI uses the bot settings for your seat, as it does for West and East.

The AI in your seat is repeatable: with the same seed, the same personality and the same hand-overs at the same moves, **Replay Seed** gives the same game. A different personality, a hand-over at a different move, a move you make yourself, or a different seat swap in Free play gives a different game.

The hand-over is for that game only. The next game starts with you in your seat, also after **Replay Seed** or **Try again**. A saved game resumed with the Your seat switch off (always so after a reload) gives you your seat back; the game stays assisted.

## Replay a game

The same seed gives the same deals: `index.html?seed=123456`. The panel shows the current seed with a **Copy** button.

The seed is one 32-bit number. It sets the bots (Free play), the first dealer and the shuffles. It cannot hold more data. A **replay code** holds the full game: the seed, the mode and wave, the seats, every player decision (discards, bids, plays), the result, and the AI settings that the bots used as generic variables: the Settings-panel values (tier, courage, real table, hunches, brain farts and each knowledge switch) when a bot played with them, and a flag when a bot played as its personality (see [docs/replay-code.md](docs/replay-code.md), 4.4). The Engine keeps the decisions in `state.decisions`. System steps (deal, flip, advance) are not kept, because the state sets them. A code is about 950 to 2,200 characters, for example `KCT2-AgEFAZIhAgMC…`.

The format has room to grow: optional sections that old readers skip, a generic key/value section, notes (MARK) in the decision stream, and a rules version. The full spec is [docs/replay-code.md](docs/replay-code.md). The format holds at least 20 hands with a showdown in each hand (about 2,850 characters). Codes from the first release (`KCT1-`) still read.

The app keeps the codes of the last 20 finished games in this browser (`kct.replays`). There is no replay UI yet. Use the console:

```js
KCT.App.replayCode()                        // the current (or just finished) game as a code
KCT.App.replays.list()                      // [{ code, mode, wave, west, east, winner, scores, assisted, at }], newest first
KCT.Replay.decode(code)                     // { v, rules, seed, mode, wave, seats, decisions, result, flags, endedAt, meta, unknown }
KCT.Replay.run(code)                        // { ok, finished, state, steps } or { ok: false, error }
const c = KCT.Replay.cursor(code)           // step-by-step player
c.step()                                    // { action, events } for one Engine step, or null at the end
c.seek(40); c.state                         // go to step 40 (forward or back) and read the state
```

`run` and `cursor` take seat names as a second argument (for example `['You', 'Vex', 'Doc']`). Without them, the seats are You, West and East. A game resumed from a save made before replay codes has no decision list, so it has no code.

## Console

The panel controls do not update after these calls.

```js
KCT.SelfTest.run({ games: 500 })            // tests, with 500 simulated games (default 40)
KCT.AI.setSkillTier('shark')                // novice, casual, club or shark
KCT.AI.setStyle({ courage: 'bold' })        // timid, cautious, normal or bold
KCT.AI.setStyle({ realTable: true })        // real-table bots
KCT.AI.setThinking({ worlds: 10, playoutSkill: 0.5 })
KCT.AI.setKnowledge({ bids: false })
KCT.App.newGame(123456)                     // new game with a given seed
KCT.Engine.audit(KCT.App.app.state)         // [] means all 33 cards are accounted for
KCT.App.backup.download()                   // save all app data (also a game in progress) as a .json file
await KCT.App.backup.toCode()               // the same as a text code (KCTS1-…)
await KCT.App.backup.inspect(codeOrFile)    // what a backup holds; changes nothing
await KCT.App.backup.restore(codeOrFile)    // REPLACES all app data on this device, then reloads (no undo)
```

`KCT.App.app.state` holds every hand, so use it for testing only.

## Install and offline play

The game is a PWA (installable web app). On GitHub Pages (HTTPS), the browser offers **Install** or **Add to Home Screen**. It then opens in its own window, as **Cut-Throat**, with the keycap 3 icon, and plays offline.

| File | What it is |
|---|---|
| `manifest.webmanifest` | App name, colors and icons. |
| `sw.js` | Service worker: offline play and the update prompt. |
| `icons/` | `icon.svg` and `icon-maskable.svg` are the sources of the PNG icons. |

**Updates.** The app opens from its cache, then checks the network for a changed `index.html`. If it finds one, a note says **A new version is ready**. It shows only between games (or on the menu at launch). **Reload** loads the new version; **Later** asks again after the next game. A new version needs no version number: publish the changed `index.html`. The check ignores changes that ad blockers make to the page, such as removed `<link>` tags, so turning one on or off is not a new version. Change `sw.js` only to change how caching works. The manifest and icons also open from the cache, and the app fetches them again in the background each time, so a changed icon arrives on the next load.

**Persistent storage.** At start-up (on HTTPS), the app asks the browser to keep its storage (`navigator.storage.persist()`), so that progress, results, saved games and replay codes are not cleared when the disk is low. It asks only while the storage is not persistent yet. Chrome and Safari decide without a prompt, and they usually agree for an installed app. Firefox asks you one time. **Settings → Install** shows the result. A Safari tab that is not installed can lose its storage after 7 days without a visit, so install the app on iPhone and iPad.

The service worker does not run from `file://`. The game still works there, without install or offline play. In a local copy, Settings says that its progress is separate from the hosted game, and the install check shows one line instead of the checks that do not apply.

## Publishing

GitHub Pages serves the `gh-pages` branch. Copy all of these from `main` to it: `index.html`, `manifest.webmanifest`, `sw.js`, `icons/` and `.nojekyll`.

## Tests

The `tests/` folder has browser tests: the self-tests, two full games through the controls, stress tests for the Engine, replays, saves, backups and the AI, and a long soak. They are not part of the published app. See [tests/README.md](tests/README.md).
