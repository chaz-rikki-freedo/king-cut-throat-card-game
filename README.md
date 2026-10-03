# King Cut-Throat

A browser game in one file, `index.html`. Open it in a browser to play. This file covers the settings panel only.

## Settings panel

Click **Settings** in the footer, or add `?settings=1` to the URL (this also turns on logging). The panel has four parts, from top to bottom.

### Bots

All bot settings apply to all bots and reset on reload. **Defaults** resets them all.

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
- **Personalities** (Settings → Bots, on by default): each bot plays its own skill tier, bid courage and Real table setting. Off: every bot plays with the Bots and Advanced settings.

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
