# King Cut-Throat Euchre

A browser game in one file, `index.html`. Open it in a browser to play. This file covers the debug tools only.

## Debug panel

Click **Debug** in the top bar, or add `?debug=1` to the URL.

| Control | What it does |
|---|---|
| **Logging** | Starts the timestamped event log (public information only). |
| **AI plays my seat** | The AI plays for you, with only your seat's information. |
| **Run self-tests** | Runs the built-in tests; results appear in the log area. |
| **Clear** | Clears the log area. |

### AI thinking

Both settings apply to all bots, change how long the bots think, and reset on reload.

- **Hunches** (1–200, default 10): how many guesses about the hidden cards the bots make for each decision. Fewer hunches make them sloppier. More than 40 adds no measured strength.
- **Brain farts** (0–100%, default 30%): how often the bots imagine a random card when they replay a hand in their heads. More brain farts make them judge moves less well. 0% is the strongest setting.

### AI knowledge

Each switch turns one kind of knowledge on or off for all bots. By default only **Watches score** is on; **Defaults** restores that. All on, with 40 hunches and 0% brain farts, is the strongest AI. The switches are listed by measured effect on bot strength, largest first.

| Switch | Off means the bots… |
|---|---|
| **Spots voids** | ignore which suits each player is out of |
| **Remembers discards** | forget the cards they put in the outside pile |
| **Plans showdowns** | always try to take tricks |
| **Reads bids** | treat bids as meaningless |
| **Watches score** | play for points only. On, the bots watch the race to 10 more and more as the leading score passes 5 (6: 25%, 7: 50%, 8: 75%, 9: 100%). |
| **Tracks upcard** | lose track of the turned card after the bidding |

## Replay a game

The same seed gives the same deals: `index.html?seed=123456` (the panel shows the current seed).

## Console

```js
KCT.SelfTest.run({ games: 500 })            // tests, with 500 simulated games (default 40)
KCT.AI.setThinking({ worlds: 10, playoutSkill: 0.5 })
KCT.AI.setKnowledge({ bids: false })        // the panel controls do not update
KCT.App.newGame(123456)                     // new game with a given seed
KCT.Engine.audit(KCT.App.app.state)         // [] means all 33 cards are accounted for
```

`KCT.App.app.state` holds every hand, so use it for debugging only.
