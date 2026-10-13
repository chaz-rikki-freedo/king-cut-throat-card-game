# Human play and the bots

A design note, not a spec. It records what we see at real tables, what we think causes it, and what we could measure or build. None of it is in the app yet. Each part says whether it is an observation, a hypothesis or a proposal, so we can check it later.

Started 2026-10-13.

## Observation

People at real tables mostly play worse than the bots. They make more bad bluffs (calls on weak hands), so games swing more and comebacks are more common than at a table of bots.

## Model: three lenses

Keep the question "are the rules fair?" apart from the question "how does a game feel?". Bots answer the first question. People answer the second.

| Lens | Who plays | What it answers | What it tunes |
|---|---|---|---|
| **Rules** | Shark against Shark | Are the rules fair? Measure the seat and dealer edge, the value of calling trump, and whether a player near 10 can still be stopped. | House rules and scoring. |
| **Experience** | A human-style bot against the personalities | How does a game feel? Measure lead changes, how close the scores end, and how often a player who trailed wins. | Personalities, wave order, banter. |
| **Calibration** | Real people, through replay codes | Does the human-style bot play like real people? | The human-style bot. |

The comebacks show up only in the Experience and Calibration lenses. A Shark-only table makes few of the mistakes that lead to a comeback, so it can't show them.

## Hypothesis: people make the same mistakes over and over

People don't make random mistakes. They make the same few mistakes over and over:

- They call trump on weak hands, more often when they're behind or impatient.
- They don't count cards, so they bid without noticing that a suit is already gone.
- They don't adjust to the score. A player near 10 still gambles, and a player far behind doesn't press hard enough.
- Once their bluff is caught, they get reckless, which leads to another swing.

The bots make mistakes differently. **Brain farts** are random noise: a bot imagines a random card when it plays a hand out in its head. Random noise lowers a bot's strength, but it doesn't produce comebacks. Comebacks come from repeated bad bets, and random noise doesn't make repeated bad bets.

## Hand value

Hand value is the game's own score for how good a hand is with a given suit as trump. It comes from `handValue(hand, trump)` in the AI section of `index.html`. It estimates how many tricks the hand will take, plus a bonus for the King points it is likely to win:

```
hand value = expected tricks + 0.9 × expected King points
```

It's a quick rule of thumb, not a simulation. Each card adds a fixed amount:

| Card | Adds to tricks |
|---|---|
| Top trump down to the lowest trump (`TRUMP_VAL`) | 1.00 down to 0.32 |
| Each trump past the second | +0.20 more |
| Off-suit Ace | 0.62 |
| Off-suit King | 0.42 with the Ace in the same suit, 0.28 with one other card in the suit, 0.18 alone |
| Off-suit Queen | 0.28 with the Ace and King in the same suit, otherwise 0.07 |
| Any other off-suit card | 0.02 |
| A suit with no cards in it, when you hold 2 or more trumps | 0.22, because you can trump in when that suit is led |

A King adds King points too: 0.55 as trump, and 0.45 or 0.22 off-suit.

A bot that bids by rule calls trump when its hand value reaches a threshold (`BID_THRESHOLDS`):

- **Round 1:** 3.05. The value of the turned card is partly subtracted first, at 85% (`round1Value`).
- **Round 2:** 2.95, or 2.7 for the last seat.

Courage and Real table move that threshold up or down (`bidLimit`):

| Setting | Change to the threshold |
|---|---|
| Timid | +1.0 |
| Cautious | +0.5 |
| Normal | 0 |
| Bold | −0.4 |
| Real table | another +0.5 (not for personalities) |

So a Normal bot calls in round 2 at about 3 expected tricks. A Real table bot waits for about 3.5. Bots that plan their bids, which is most bots when Real table is off, use hand value only to rank their choices. They decide by playing the hand out in sampled deals.

The values above match `index.html` on 2026-10-13. If the code changes, the code wins.

## Gap: Real table doesn't bluff

**Real table** makes the bots pass *more* often (see **Real table** in the README). The people we watch do the opposite: they bluff more. That causes two problems:

1. **The "Your win" column in Waves may be off.** It comes from a Casual, Real table bot in your seat, which is a cautious player. A player who bluffs too often has a different win rate and a different curve across the 18 waves.
2. **The bots' model of the other seats is wrong for people.** When the bots read bids and play hands out in their heads, they expect the other seats to play the same way they do. So a bot never thinks "this person calls on garbage." It doesn't punish bluffs the way a sharp human would, and it doesn't fall for them the way a weak human would.

## Proposals

None of these is planned yet. Each one gives us something we can check.

1. **Turn comebacks into numbers.** Track these for every game:
   - How often the player who trailed by 3 or more wins.
   - How many times the lead changes.
   - How often a call fails, and what the hand's value was when the caller called.

   Compare bot tables with human replays on the same numbers. `tests/roundrobin.js` is the natural place for the bot side.
2. **Fit a human error profile from replay codes.** Each code holds every bid and the hand behind it. Score each human bid with `handValue`, then plot how often people call at each hand value, split by whether the caller was ahead or behind. A call well below 2.95 is a bluff in numbers. A lower curve for players who were behind is score-driven bluffing, measured instead of guessed.
3. **Add a bluffing style next to Real table.** It calls at a lower hand value when behind, and it doesn't count cards. The courage offset already lowers the hand value needed to call. What's missing is making it depend on the score. Measure Waves against this style as well as against Real table.
4. **Decide what the bots do with a bluffer.** There are two valid options, and they make different games:
   - **Bots that exploit it** (most likely the top Sharks: Vex, Doc, Mei): they remember who got caught bluffing and defend harder against that player. People learn the bluff doesn't pay.
   - **Bots that bluff too** (Gus, Tex): this brings back the swingy game people know and enjoy. That's good for the early waves and for Free play.
5. **Treat swinginess as a design choice.** Comebacks keep weak players engaged. A bot-only table that never swings can feel settled by hand 3. Set a target comeback rate for each wave tier, and tune personalities toward it.

## Summary

- **Rules:** tune against Sharks.
- **Difficulty:** tune against a human model that has been checked with real replay codes.
- **Fun:** tune with comeback numbers.

Right now the Rules lens is solid. The human model, Real table, captures caution but not the reckless bluffing we see.

## Open questions

- How many human replay codes do we need before the call-rate curve is worth trusting?
- Should the bluffing style replace Real table for the "Your win" column, or sit beside it?
- Do we want comebacks to feel the same in every wave, or fade as the waves get harder?
