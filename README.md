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

## AI knowledge switches

The second row of the debug panel turns off one type of board knowledge for all AI players. All switches are on by default; that is the normal AI. A change applies to the next AI decision, and the table log records it. The switches are not saved: a page reload turns them all on again.

| Switch | When it is on, the AI… | When it is off, the AI… |
|---|---|---|
| **Reads bids** | gives more weight to deals that agree with each player's bids | treats all deals that agree with the cards as equally likely |
| **Tracks turned card** | knows where the turned card went (receiver's hand or outside pile) | treats the turned card as one more unseen card after the bidding |
| **Knows own discards** | knows which cards it put in the outside pile | treats its own discards as unseen cards |
| **Uses voids** | never gives a player cards of a suit that the player showed a void in | ignores voids |
| **Score-aware** | plays for its chance to win the game | plays for points only: its own points minus the opponents' average |
| **Showdown plans** | also tests the duck and balance plans for its later cards | tests greedy play only |

**All on** turns all switches on again. The AI never gets the hidden cards, whatever the switches show.

From the console:

```js
KCT.AI.knowledge                          // current switches
KCT.AI.setKnowledge({ bids: false })      // change switches; the checkboxes do not update
KCT.AI.setKnowledge(KCT.AI.KNOWLEDGE_DEFAULTS) // all on
```

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
KCT.SelfTest.run({ games: 500 })   // run the tests with 500 simulated games (default 40)
KCT.SelfTest.run({ games: 5, planner: true }) // simulated games with the full AI (slow)
KCT.Logger.enabled = true          // start logging without the panel
KCT.Logger.lines                   // all log lines (latest 1500)
KCT.App.newGame(123456)            // start a new game with a given seed
KCT.Engine.audit(KCT.App.app.state)// card-conservation check; [] means all 33 cards are correct
```

`KCT.SelfTest.run()` returns `{ passed, failed, results, stats, ms }`. `stats` counts what the simulated games did: hands, Showdowns, sweeps, King points, and how each game ended.

By default, the simulated games use the AI's fast play-out policy. That policy sees all the cards, so these games test the rules only, not the AI. Use `planner: true` to play the games with the full AI. Each decision then takes about 5–50 ms.

**Caution:** `KCT.App.app.state` is the full game state, with all hands. Use it for debugging only.

## What the self-tests cover

- Card order: Joker, Right Bower, Left Bower, then trump and non-trump ranks.
- Following suit, including the Left Bower and void hands.
- The deal order, all bidding paths, the kitty transfer and the discard counts.
- King points, hand scoring, sweeps, the Showdown and the 0-point floor.
- Immediate victory during a trick, at hand end and in a Showdown.
- Dealer rotation, redeal, abandoned hands and restart.
- The AI's sampled worlds: hand sizes, own discards, the turned card, known voids.
- The AI's decision does not change when hidden cards move, and the same view always gives the same decision.
- The win-chance table: about 1/3 each at 0–0–0, the sum is 1, and the values are symmetric.
- One full hand with the full AI in all seats.
- Each AI knowledge switch changes the sampled worlds as expected, and the AI's decisions stay legal with each switch off.
- Simulated full games. After each action, the tests check that all 33 cards are present and that no illegal card is accepted.
