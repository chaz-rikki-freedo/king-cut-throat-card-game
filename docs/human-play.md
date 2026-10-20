# Human play and the bots

A design note, not a spec. It records what we see at real tables, what we think causes it, what we measured, and what we could build. Each part says whether it is an observation, a hypothesis, a measurement or a proposal, so we can check it later.

Started 2026-10-13. Updated 2026-10-13 with the measurements behind Dynamic mode. The Dynamic design itself is on [issue #117](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/117). Updated 2026-10-14: Dynamic mode is in the app (see **Dynamic** in the README).

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

So a Normal bot calls in round 2 at about 3 expected tricks. A Real table bot waits for about 3.5.

Hand value is used by every bot, not only the ones that bid by rule. It drives:

- the rule-based bids,
- the moves of the other seats when a bot plays a hand out in its head,
- how a bot reads the other seats' bids,
- which discards a bot considers.

The values above match `index.html` on 2026-10-13. If the code changes, the code wins.

**Where the values came from (measurement):** the weights and thresholds are in the first commit of the repository's history, with no recorded source and no recorded check.

## Measurements (2026-10-13)

These come from bot-only simulations. The scripts are in `tests/` (see [tests/README.md](../tests/README.md)), so each one can be run again. Bots stand in for people here, so check each result against real players' replay codes once there are some.

### Hand value predicts too many tricks, but ranks hands well

From `tests/handvalue.js`: 600 Shark games, 5,055 hands.

- **Too many tricks:** the three seats' predictions add up to about **9 tricks per hand**, but a hand has 7. That's about 0.66 too many per seat, and the error is largest in the range where bids are decided.
- **The right order:** the correlation between predicted and actual tricks is **0.80**, so the order of hands is mostly right and the level is off.
- **The wrong proportions:** trump length matters far more than the formula says. In the fit, each trump past the second is worth about 0.70 tricks instead of 0.20. Low trumps are worth almost nothing as single cards. Off-suit Queens, and a King behind its own Ace, are worth about nothing.
- **The fitted weights:** they cut the average trick error from 1.01 to 0.74, and are saved in `tests/data/handvalue-fit.json`.
- **The bid thresholds call on weak hands:** a caller at a hand value of 3.0 to 3.5 won the hand only 22% of the time. It reached 50% only at about 4.0 to 4.5.

### What makes a bot stronger

From `tests/levers.js`: 300 to 400 games per setting, a test bot against two fixed opponents. Each result is accurate to about ±5 points.

| Setting | Effect on strength |
|---|---|
| **Hunches** | The main dial. Against two Casual bots, a Shark wins 46% at 40 hunches and 17% at 1, and every step lowers it. |
| **Knowledge switches, one at a time** | No single switch makes a measurable difference. The README ranks them "by measured effect", but these numbers don't support that ranking. |
| **Knowledge switches, as a group** | Matter only at low hunches: no effect at 10 hunches, about 4 points at 5, about 7 at 3. |
| **Brain farts** | No effect from 0% to 60% at 40 hunches. They matter only at low hunches, or at 90%. |
| **Fitted hand-value weights** | No measurable change in strength, for Sharks or for Real table bidders. |
| **Bid thresholds, raised by up to 1.0** | No measurable change in strength. |

So recalibrating hand value would make it more accurate without making the bots play better. Changing it would also change how every bot plays in every mode, and the Waves "Your win" numbers would need measuring again.

### What separates a weak player from a strong one

From `tests/review.js`: 150 games per setting. A "player" seat played at several strengths against two Casual bots, and once as a new player who throws away its best cards.

- **Gross mistakes show up fast.** A player who throws away their best cards is obvious within **2 hands**, from the cards they discard or from how weak their hand is at bid time. Every bot strength discards about equally well, so these measures say nothing about finer skill.
- **Finer skill shows up slowly.** Points per hand, failed calls and the hand value at a call all fall steadily with skill. But telling a Novice-strength player from a Shark-strength one takes about **170 hands**, roughly 17 games. A floor-strength player takes about **100 hands**.
- **Matching a bot's card choices isn't a skill measure.** Card plays agreed with a Club bot 76% of the time for a Shark, and 67% for the weakest setting. The new player scored 73%.

## Gap: Real table doesn't bluff

**Real table** makes the bots pass *more* often (see **Real table** in the README). The people we watch do the opposite: they bluff more. That causes two problems:

1. **The "Your win" column in Waves may be off.** It comes from a Casual, Real table bot in your seat, which is a cautious player. A player who bluffs too often has a different win rate and a different curve across the 18 waves.
2. **The bots' model of the other seats is wrong for people.** When the bots read bids and play hands out in their heads, they expect the other seats to play the same way they do. So a bot never thinks "this person calls on garbage." It doesn't punish bluffs the way a sharp human would, and it doesn't fall for them the way a weak human would.

The measurements don't close this gap. The hand-value results show how the thresholds relate to real outcomes. They don't show how real people bid.

## Dynamic mode

Dynamic is a third mode, next to Free play and Waves, in the app since 2026-10-14. The bots ease off for players who are clearly new, and tighten back to normal as the players improve. It grew out of this note. The decisions, and the measurements behind them, are in the decision record on [issue #117](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/117). In short:

- **It only ever makes the game easier.** The bots never play harder than normal, and never punish a new player.
- **The bots never see hidden cards during play.** A review after the game may use the whole deal, only to set the starting easing for the next Dynamic game.
- **It eases mainly by lowering hunches,** following an easing ladder that was measured row by row, down to a floor at about Novice strength with 1 hunch. Style never changes (only feints and wariness fade, since 2026-10-20), so each personality still plays like itself.
- **It spots gross mistakes within a game,** using the fast signals above. It judges finer skill with the slow ones, from the player's record across games plus the hands of the current game.
- **Bluffing stays a real tactic.** The bots never adapt to a player's bluffing, because adapting would make them harder than normal.
- **The game's own hand value stays as it is.** Dynamic's reads and review use the fitted estimate instead.

The record left only tuning open. The build uses these values, in `Dynamic.TUNE` and the constants beside it in `index.html`. Playtests should set them:

| Setting | Default | Meaning |
|---|---|---|
| Slow-path weight | w = h / (h + 50) | Decision 14 set h / (h + 100). `node tests/pace.js 20 5 4 100,50,30` showed that 100 barely helps a weak player within five games (mean easing about 0.1), while 50 roughly doubles the help and adds little easing for normal players. Changed to 50 on 2026-10-14 (PR #124). |
| Smoothing | 0.99 per sample | The profile follows about the last 100 calls, bids and Dynamic hands. |
| Small-sample priors | 10 points, 5 calls, 10 bids | Pull a short record toward normal play: an even score share, 45% failed calls, no bid errors. |
| Failed calls | +0.25 at most | Added to the slow target from 45% failed calls, in full at 80%. |
| Bid errors | +0.25 at most | Added to the slow target, in full at 25% of bids. |
| Card-play slips | normal 2%, full at +6%, weight +0.25, prior 60 plays | Added in step 4c (2026-10-20). A slip is a King thrown under the winning card, a last card winning with more than it takes, or a dead trump, each while another card could go. 2% is about the Casual bots' rate (`node tests/habits.js`). |
| Bid-error cut-offs | below 1.2, at 4.2 or more | A call on a fitted hand value below 1.2, or a pass on one of 4.2 or more. |
| Read pace | Shark 2, Club 3, Casual 4, Novice 6 | Weak visible hands a bot sees before its read line (see [banter.md](banter.md)). |

`node tests/dynamic.js rates 80 4` measured the fast path in the build: it caught a new player who throws away their best cards within 3 visible hands in 90.9% of games, and fired on at most 1.4% of 3-hand windows for ladder rows 4, 6 and 8.

## Habit report (2026-10-20)

The ten personalities are meant to feel like ten different people at the table. This report is step 1 of a plan to make them feel that way without making them stronger: measure how each seat plays first, then change it.

**The plan, by mode:**

- **Free play is the forge.** It will expose every setting for each seat, so a table can be tuned precisely.
- **Dynamic is the marquee mode.** It will take only the settings proven in Free play, and it keeps its rules: never harder than normal, never adapting to your bluffs.
- **Waves stays the measured ladder.** It is measured again whenever the bots change.

**The tools.** `KCT.Habits` counts each seat's habits from a finished game: how it leads, follows, trumps in, throws off when void, plays its Kings and bids. `KCT.App.habits()` reports on the games in Your profile, and `KCT.App.explain(n)` replays each bot decision of a game with the options the bot weighed. `tests/habits.js` prints the report for all ten bots.

**Baseline:** `node tests/habits.js 1 4` (120 games). Spread is the highest bot rate minus the lowest.

| Habit | Lowest | Highest | Spread |
|---|---|---|---|
| Leads from its longest suit | 71% | 75% | 4 |
| Wins with the cheapest winner | 87% | 92% | 4 |
| Void: throws from the shortest side suit | 75% | 79% | 4 |
| Tries to win when it can | 91% | 96% | 6 |
| Leads trump | 33% | 41% | 9 |
| Second hand plays its lowest | 48% | 63% | 15 |
| Names trump in round 2 | 65% | 100% | 35 |
| Calls in round 1 | 13% | 63% | 50 |

**What it shows:**

1. **The bots differ in their bids, but hardly in their card play.** Bid courage and Real table only act on the bids. Card play has no style setting, so most card habits spread 4 to 15 points across all ten bots.
2. **No bot plays a deliberate wrong card.** All ten try to win a trick they can win more than 90% of the time, and most often with the cheapest card that wins.
3. **Ties go to the weakest card.** `KCT.App.explain(n)` shows options with the same value, and every bot then plays the weakest one. That is one shared habit, not ten.

### Habits, reads and feints (steps 3a to 3c, 2026-10-20)

Each step was measured with `node tests/habits.js 1 4` and `node tests/roundrobin.js 4 4 1` (480 games, the same seeds each time). Each bot plays 144 games, so a change under about 8 points is within noise.

- **3a, habits:** each bot likes some plays when its best cards are about equal, within its habit strength (0 to 5% win chance per card).
- **3b, reads:** each bot reads the other players' public plays (a lead means length, a King led means no Ace, a throw-off means short), believed in proportion to its credulity.
- **3c, feints and wariness:** bots play against type, within their habit strength, and a caught feint lowers belief in that player for the rest of the hand.

| Habit | Baseline spread | After 3c |
|---|---|---|
| Leads from the longest suit | 4 | 29 |
| Leads from the shortest suit | 4 | 28 |
| Leads trump | 9 | 30 |
| Wins with the cheapest winner | 4 | 25 |
| Second hand plays its lowest | 15 | 31 |
| Trumps in when void | 11 | 38 |

| Group | Step 2 | 3a | 3b | 3c |
|---|---|---|---|---|
| Shark and Club | 42 to 51% | 42 to 54% | 40 to 56% | 40 to 58% |
| Casual | 24 to 27% | 24 to 25% | 24 to 27% | 26 to 27% |
| Novice | 13 to 17% | 13 to 19% | 15 to 16% | 13 to 17% |

The three strength groups stay apart at every step. **Mei** climbed from 49% to 58%: Mei has no habits and no feints, so as the other bots take on small, chosen costs, the one bot that plays straight gains in their place. The game is zero-sum, so the pack is not stronger. Decision (2026-10-20): keep Mei as is, the counter who never feints.

Next steps: the Dynamic upgrade, then Waves measured again.

### Dynamic upgrade (step 4, decided 2026-10-20)

These change decisions on issue #117:

1. **Opponents by level (4a, done).** A new player meets no Shark; one at most while the starting easing is above 0.2. A pair that shares no bot with the last Dynamic game comes first.
2. **Easing adds human-style weakness (4b, done).** The measured hunch ladder stays. On top of it, as the easing rises, the bots believe your plays more, follow their habits more plainly, and stop feinting and guarding.
3. **Your card play (4c, done).** The post-game review also counts card-play slips, which feed the slow easing, and Your profile shows your card habits beside the bots'.

## Proposals

Each one gives us something we can check. The status of each is as of 2026-10-13.

1. **Turn comebacks into numbers.** Track these for every game:
   - How often the player who trailed by 3 or more wins.
   - How many times the lead changes.
   - How often a call fails, and what the hand's value was when the caller called.

   Compare bot tables with human replays on the same numbers. `tests/roundrobin.js` is the natural place for the bot side.

   *Status: open. Failed calls and the hand value at a call are now measured for bots (`tests/review.js`). The comeback numbers are not.*
2. **Fit a human error profile from replay codes.** Each code holds every bid and the hand behind it. Score each human bid, then plot how often people call at each hand value, split by whether the caller was ahead or behind. A call well below the thresholds is a bluff in numbers. A lower curve for players who were behind is score-driven bluffing, measured instead of guessed.

   *Status: open, waiting on real replay codes. Score the bids with the fitted estimate in `tests/data/handvalue-fit.json`, not with the game's hand value, which predicts too many tricks.*
3. **Add a bluffing style next to Real table.** It calls at a lower hand value when behind, and it doesn't count cards. The courage offset already lowers the hand value needed to call. What's missing is making it depend on the score. Measure Waves against this style as well as against Real table.

   *Status: open.*
4. **Decide what the bots do with a bluffer.** There are two valid options, and they make different games:
   - **Bots that exploit it** (most likely the top Sharks: Vex, Doc, Mei): they remember who got caught bluffing and defend harder against that player. People learn the bluff doesn't pay.
   - **Bots that bluff too** (Gus, Tex): this brings back the swingy game people know and enjoy. That's good for the early waves and for Free play.

   *Status: decided for Dynamic. No bot adapts to a player's bluffing, so the bots don't exploit it. Whether some personalities should bluff more themselves is still open.*
5. **Treat swinginess as a design choice.** Comebacks keep weak players engaged. A bot-only table that never swings can feel settled by hand 3. Set a target comeback rate for each wave tier, and tune personalities toward it.

   *Status: open.*

## Summary

- **Rules:** tune against Sharks.
- **Difficulty:** tune against a human model that has been checked with real replay codes.
- **Fun:** tune with comeback numbers.

Right now the Rules lens is solid. The human model, Real table, captures caution but not the reckless bluffing we see. For bot strength, hunches is the setting that counts. The game's hand value ranks hands well, but its numbers run high.

## Open questions

- How many human replay codes do we need before the call-rate curve is worth trusting? In bot data, telling skill levels apart from results takes about 100 to 170 hands.
- Should the bluffing style replace Real table for the "Your win" column, or sit beside it?
- Do we want comebacks to feel the same in every wave, or fade as the waves get harder?
- Do the bot-based thresholds for spotting gross mistakes hold for real new players?
