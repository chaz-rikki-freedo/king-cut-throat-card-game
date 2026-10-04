# King Cut-Throat

A browser game in one file, `index.html`. Open it in a browser to play, or install it as an app (see **Install and offline play**). This file covers the menu, waves, saved games, the app files and the settings panel.

## Menu

Each launch opens on the menu. The header shows the current mode: **Wave N of 18**, **Free play** or **No game**. Click **Menu** in the footer to open it during a game (the game waits).

| Item | What it does |
|---|---|
| **Resume Waves** / **Resume Free play** | Continues the unfinished game of that mode. Shown only when one is saved. At launch, the last game played is the main button. |
| **Play wave** | Starts the wave chosen in the list (the highest open wave by default). A ✓ marks a cleared wave. |
| **New game** | Free play: the seed picks two random opponents. |
| **Tutorial** | Coming soon (disabled). |
| **Just enter** (launch) / **Close** | Closes the menu. At launch, the table stays empty: Rules, Settings and the profiles work, and **Choose a game** opens the menu. |

A link with `?seed=` or `?wave=` starts that game at once, without the menu.

### Free play: choose seats

In Free play only, after the deal and before anyone discards in hand 1, a dialog shows your two opponents: West (your left) and East (your right). **⇄** swaps them and **Play** starts the discard. This is the only chance to swap. **Replay Seed** offers it again. There is no dialog when the AI plays your seat at the start.

## Saved games, settings and results

The app keeps these in the browser (`localStorage`), so a closed tab loses nothing:

- **One unfinished game per mode** (`kct.slots`), saved after every action, with its Latest Scroll (last 1500 lines). Starting a new game in a mode replaces that mode's game; the menu asks first if it has begun. A finished game is not kept.
- **Wave progress** (`kct.waves`).
- **Settings** (`kct.settings`): Personalities, skill, bid courage, Real table, AI thinking and knowledge, Logging. Speed is not kept: each load starts at Normal.
- **Results** (`kct.stats`): played and won, per mode, per table (West/East) and per opponent. A game where the AI played your seat adds no results. There is no results screen yet.

If a new version cannot load a saved game, the game is dropped and the menu says so once. Wave progress and results are kept. Change `SAVE_FORMAT` in `index.html` when the Engine state changes shape.

## Settings panel

Click **Settings** in the footer, or add `?settings=1` to the URL (this also turns on logging). The panel has four parts, from top to bottom.

### Bots

All bot settings apply to all bots and are kept after a reload. **Defaults** resets them all. In a Waves game, **Personalities** and the bot settings are dimmed: a wave always uses its personalities. The switch keeps its value for Free play.

| Setting | What it does |
|---|---|
| **Skill** | Sets AI thinking and AI knowledge together. Shows **Custom** when you change them under Advanced. |
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

### Advanced: AI thinking and knowledge

Click the heading to open it.

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
| **Logging** | Starts the timestamped event log (public information only). |
| **Seed / Copy** | Shows the current game's seed and copies it. |
| **Run self-tests** | At the bottom. Runs the built-in tests and shows a summary by area, with any failures listed. |
| **Clear** | At the bottom. Clears the log and the test results. |

## Opponents

Ten named bots: Vex, Doc, Ace, Mei, Gus, Lou, Viv, Tex, Kit and Zen. Each game seats two of them, West and East. The seed picks them, so a replay meets the same two.

- Each bot has its own color. The name has that color on the board, and the log shows it as a colored tag. You are teal.
- Tap a bot's figure to see its profile: a quote, a hint, and two bars. **Card sense** and **Nerve** go up to 4. **Set in their ways** marks a bot with human habits.
- **Personalities** (Settings → Bots, on by default): each bot plays its own skill tier, bid courage and Real table setting. Off: every bot plays with the Bots and Advanced settings. For a personality, bid courage alone sets how loose it bids; Real table does not add its extra 0.5.

| Bot | Skill | Bid courage | Real table |
|---|---|---|---|
| Vex | Shark | Bold | |
| Doc | Shark | Cautious | |
| Ace | Club player | Bold | |
| Mei | Shark | Normal | |
| Gus | Casual | Bold | on |
| Lou | Novice | Timid | |
| Viv | Club player | Cautious | |
| Tex | Novice | Bold | |
| Kit | Novice | Cautious | on |
| Zen | Casual | Normal | on |

## Waves

Eighteen fixed tables, easiest first. Each wave seats two personalities, West and East. Start a wave from the menu, the URL or the console.

- The seat order is part of the wave. East gives you the trump gift when East calls, so a bold bot is easier on your right (East) than on your left (West).
- A wave always uses its personalities, also when **Personalities** is off.
- A win clears the wave. A win on the highest open wave opens the next one. A loss changes nothing.
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
KCT.Waves.progress()               // { unlocked, cleared, total, complete }
KCT.Waves.isUnlocked(5)
KCT.Waves.unlockAll()              // open every wave (for testing)
KCT.Waves.reset()                  // back to wave 1
KCT.WAVES                          // the table above, with a purpose line for each wave
KCT.App.app.wave                   // { n, open, result } for the current game
KCT.App.stats.get()                // results per mode, table and opponent
KCT.App.slots.get('free')          // the saved Free play game, or null
```

## AI plays your seat

Click the **HUMAN** tag on your seat. It changes to **AI**, and the AI plays for you, with only your seat's information. Click the tag again to take your seat back. The first time, your seat gets a personality that is not at the table. It keeps that personality for the rest of the game, however often you switch.

## Replay a game

The same seed gives the same deals: `index.html?seed=123456`. The panel shows the current seed with a **Copy** button.

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
```

`KCT.App.app.state` holds every hand, so use it for testing only.

## Install and offline play

The game is a PWA (installable web app). On GitHub Pages (HTTPS), the browser offers **Install** or **Add to Home Screen**. It then opens in its own window, as **Cut-Throat**, with the keycap 3 icon, and plays offline.

| File | What it is |
|---|---|
| `manifest.webmanifest` | App name, colors and icons. |
| `sw.js` | Service worker: offline play and the update prompt. |
| `icons/` | `icon.svg` and `icon-maskable.svg` are the sources of the PNG icons. |

**Updates.** The app opens from its cache, then checks the network for a changed `index.html`. If it finds one, a note says **A new version is ready**. It shows only between games (or on the menu at launch). **Reload** loads the new version; **Later** asks again after the next game. A new version needs no version number: publish the changed `index.html`. Change `sw.js` only to change how caching works.

The service worker does not run from `file://`. The game still works there, without install or offline play.

## Publishing

GitHub Pages serves the `gh-pages` branch. Copy all of these from `main` to it: `index.html`, `manifest.webmanifest`, `sw.js`, `icons/` and `.nojekyll`.
