# King Cut-Throat Euchre

A browser game in one file, `index.html`. Open the file in a modern browser to play. No server or build step is necessary.

This file tells you how to use the debug tools only.

## Open the debug panel

Use one of these methods:

- Click **Debug** in the top bar. Click **Close** (or **Debug** again) to hide the panel.
- Add `?debug=1` to the URL. The panel opens and logging starts when the page loads.

## Debug panel controls

| Control | What it does |
|---|---|
| **Logging** | Starts or stops the event log. Logging is off by default. When it is on, each line also goes to the browser console (`console.debug`). |
| **AI plays my seat** | The AI makes all decisions for your seat. The AI uses only the information that your seat can see. Continue screens advance automatically. Clear the box to play again yourself. |
| **seed N** | Shows the seed of the current game. |
| **Run self-tests** | Runs the test suite that is in the file. The results go to the bottom of the log area. |
| **Clear** | Clears the log area. |

## Event log format

Each line has this format:

```
[+1234ms] EVENT_TYPE key=value key=value
```

The time is in milliseconds from page load, or from the last **Clear**. Seats are numbers: `0` = You, `1` = West, `2` = East. Cards use short IDs: rank + suit (`AS`, `10H`, `JC`) and `JK` for the Joker.

The log shows only public information. It never shows opponent hands, unrevealed kitty cards, the contents of the outside pile, or the AI evaluations. A discard event gives the number of cards only.

Event types:

| Area | Events |
|---|---|
| Game | `GAME_STARTED`, `GAME_ENDED`, `ACTION_REJECTED` |
| Deal | `DEAL`, `DISCARD`, `DISCARDS_COMPLETE`, `KITTY_FLIPPED`, `HAND_VOID`, `REDEAL`, `DEALER_ROTATED` |
| Bidding | `BIDDING_ROUND`, `BID_PASS`, `TRUMP_ACCEPTED`, `TRUMP_NAMED`, `KITTY_TRANSFER`, `EXCHANGE_DISCARD`, `HAND_ABANDONED` |
| Play | `TRICK_STARTED`, `CARD_PLAYED`, `TRICK_WON`, `KING_SCORED`, `SCORE_CHANGED`, `HAND_SCORED` |
| Showdown | `SHOWDOWN_STARTED`, `SHOWDOWN_DEAL`, `SHOWDOWN_DISCARD`, `SHOWDOWN_LEAD`, `SHOWDOWN_TRICK_WON`, `SHOWDOWN_SCORED` |

`ACTION_REJECTED` shows that the engine refused an action and gives the reason. In normal play, the UI prevents illegal actions, so this event is rare.

## Replay a game

The shuffle and the AI are deterministic. The same seed gives the same deals:

```
index.html?seed=123456
```

You can use both parameters together: `index.html?seed=123456&debug=1`. If you make the same decisions, the game will be the same.

## Speed

Use the speed menu (**Slow**, **Normal**, **Fast**, **Instant**) to set how fast play goes. **Instant** with **AI plays my seat** plays a full game in a few seconds. To skip a delay, click the table or push Space. The speed setting stays in this browser.

## Browser console

The page exposes `window.KCT`:

```js
KCT.SelfTest.run({ games: 500 })   // run the tests with 500 AI-vs-AI games (default 40)
KCT.Logger.enabled = true          // start logging without the panel
KCT.Logger.lines                   // all log lines (latest 1500)
KCT.App.newGame(123456)            // start a new game with a given seed
KCT.Engine.audit(KCT.App.app.state)// card-conservation check; [] means all 33 cards are correct
```

`KCT.SelfTest.run()` returns `{ passed, failed, results, stats, ms }`. `stats` counts what the simulated games did: hands, Showdowns, sweeps, King points, and how each game ended.

**Caution:** `KCT.App.app.state` is the full game state, with all hands. Use it for debugging only.

## What the self-tests cover

- Card order: Joker, Right Bower, Left Bower, then trump and non-trump ranks.
- Following suit, including the Left Bower and void hands.
- The deal order, all bidding paths, the kitty transfer and the discard counts.
- King points, hand scoring, sweeps, the Showdown and the 0-point floor.
- Immediate victory during a trick, at hand end and in a Showdown.
- Dealer rotation, redeal, abandoned hands and restart.
- Full AI-vs-AI games. After each action, the tests check that all 33 cards are present and that no illegal card is accepted.
