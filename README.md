# King Cut-Throat

A browser game in one file, `index.html`. Open it in a browser to play. This file covers the debug tools only.

## Debug panel

Click **Debug** in the footer, or add `?debug=1` to the URL.

| Control | What it does |
|---|---|
| **Logging** | Starts the timestamped event log (public information only). |
| **Seed / Copy** | Shows the current game's seed and copies it. |
| **Defaults** | Resets hunches, brain farts, all knowledge switches and the table style. |
| **Run self-tests** | At the bottom. Runs the built-in tests and shows a summary by area, with any failures listed. |
| **Clear** | At the bottom. Clears the log and the test results. |

### AI thinking

Both settings apply to all bots, change how long the bots think, and reset on reload.

- **Hunches** (1–200, default 10): how many guesses about the hidden cards the bots make for each decision. Fewer hunches make them sloppier. More than 40 adds no measured strength.
- **Brain farts** (0–100%, default 30%): how often the bots imagine a random card when they replay a hand in their heads. More brain farts make them judge moves less well. 0% is the strongest setting.

### AI knowledge

Each switch turns one kind of knowledge on or off for all bots. By default only **Watches score** is on. All on, with 40 hunches and 0% brain farts, is the strongest AI. The switches are listed by measured effect on bot strength, largest first.

| Switch | Off means the bots… |
|---|---|
| **Spots voids** | ignore which suits each player is out of |
| **Remembers discards** | forget the cards they put in the outside pile |
| **Plans showdowns** | always try to take tricks |
| **Reads bids** | treat bids as meaningless |
| **Watches score** | play for points only. On, the bots watch the race to 10 more and more as the leading score passes 5 (6: 25%, 7: 50%, 8: 75%, 9: 100%). |
| **Tracks upcard** | lose track of the turned card after the bidding |

### Table style

**Real table** (off by default) makes the bots play more like a typical human table:

- They pass more in both bidding rounds. They need 0.5 more hand value before they call trump, and they bid by this rule instead of planning the bid.
- In the first discard, they pitch their lowest cards. Jacks and the Joker stay. On equal rank, the card from the shorter suit goes first.
- When the bots read bids and play hands out in their heads, they expect the other seats to play the same way.

On, the bots are weaker. **Defaults** turns the switch off.

## AI plays your seat

Click the **HUMAN** tag on your seat. It changes to **AI**, and the AI plays for you, with only your seat's information. Click the tag again to take your seat back.

## Replay a game

The same seed gives the same deals: `index.html?seed=123456`. The panel shows the current seed with a **Copy** button.

## Console

```js
KCT.SelfTest.run({ games: 500 })            // tests, with 500 simulated games (default 40)
KCT.AI.setThinking({ worlds: 10, playoutSkill: 0.5 })
KCT.AI.setKnowledge({ bids: false })        // the panel controls do not update
KCT.AI.setStyle({ realTable: true })        // real-table bots; the panel checkbox does not update
KCT.App.newGame(123456)                     // new game with a given seed
KCT.Engine.audit(KCT.App.app.state)         // [] means all 33 cards are accounted for
```

`KCT.App.app.state` holds every hand, so use it for debugging only.
