# Human play and the bots

A design note, not a spec. It records what we see at real tables, what we think causes it, and what we measured. Each part says whether it is an observation, a hypothesis or a measurement.

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

These come from bot-only simulations. The scripts are in `tests/` (see [tests/README.md](../tests/README.md)), so each one can be run again. Bots stand in for people here.

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

### The hold (2026-10-30)

A new profile held the easing at 0, so a new player's first game met bots at full strength, and about half the time a Shark. The slow path needs about 50 hands of record to count, so a weak player gained little in the first 8 games. The build now holds the easing at 1 until the profile has `HOLD_HANDS` = 80 hands (about 8 games, counting every mode). The hold ends at once and the easing tightens as before (15% of the gap each hand).

`node tests/career.js 16 4 0,80` plays careers of 82 games from a blank profile: 8 bad games, 24 that are bad half the time, then 50 okay ones. A bad game is a floor-strength bot (1 hunch, 60% brain farts). 16 careers each, 128 games in the first 8:

| Beginner | Hold | First 8 games won | Wins per career | Longest loss streak | Careers with no win |
|---|---|---|---|---|---|
| Weak, sensible | none | 23% | 1.8 | 4.6 | 2 of 16 |
| Weak, sensible | 80 hands | 40% | 3.2 | 3.3 | 0 of 16 |
| Throws away its best cards 40% of the time | none | 7% | 0.6 | 6.5 | 8 of 16 |
| Throws away its best cards 40% of the time | 80 hands | 14% | 1.1 | 5.2 | 4 of 16 |

The games after the hold match the build without it, within the margin: the okay player wins 33% to 41% of games 33 to 82. The margin is about ±8 points for 128 games. Two limits stay open:

- **A cliff at game 9.** The easing drops from 1 to about 0.2 in one game, and the weak player's win rate in bad games falls from about 40% to about 23%. A taper over games 6 to 12 would soften it. It has not been measured. (The taper below addresses it.)
- **Gross mistakes still lose.** A player who throws away good cards wins 14% of the first 8 games even at the floor. Only help with the discard (feedback or a suggestion) addresses that.

The players are bots. Real beginners need playtests.

### The taper (2026-10-31)

The build now tapers the end of the hold. From hand 80 to hand 160 (`TAPER_HANDS` = 80), the easing can't fall below a floor that runs from 1 down to 0, at the start of a game and after each hand. No Shark sits at the table while the floor is above 0.5, until about hand 120.

`node tests/career.js 16 4 80:0,80:80` compares the hold that ends at once (`80:0`) with the build (`80:80`), with the same careers as above. 16 careers each:

| Games | Setting | Starting easing | Sharks at the table | Win, all games | Win, bad games | Win, okay games |
|---|---|---|---|---|---|---|
| 9-16 | Hold ends at once | 0.19 | 0.58 | 32.0% | 27.9% | 35.8% |
| 9-16 | Taper | 0.56 | 0.27 | 32.0% | 21.3% | 41.8% |
| 17-32 | Hold ends at once | 0.20 | 0.57 | 28.9% | 19.0% | 37.8% |
| 17-32 | Taper | 0.20 | 0.57 | 26.6% | 16.5% | 35.6% |
| 33-82 | Hold ends at once | 0.12 | 0.58 | 37.5% | - | 37.5% |
| 33-82 | Taper | 0.13 | 0.58 | 35.9% | - | 35.9% |

The taper does what it was built for: the easing falls over about 8 games instead of in one, and half as many Sharks sit at the table in games 9 to 16. It did not raise the win rate: the differences are within the margin (about ±11 points for the 60 to 70 bad games in games 9 to 16). Between easing 0.2 and 0.6 the bots stay well above a floor-strength player, so only the hold at full easing changes who wins. The games after the taper match the build without it.

An earlier measurement of the hold that ends at once had a fault: with `TAPER_HANDS` at 0, the floor divided 0 by 0 at exactly hand 80, and that game's easing was not a number. The build (80) was never affected. The table above is from the guarded code.

## Tally: what each seat was dealt (2026-10-31)

Chance is as large as the margin of most games: a seat's points per hand average about 0.8 with a spread of about 0.8, so a 10-hand game carries about ±2.5 to 3 points of it. The cards a seat is dealt are only one part of that chance (see Validation). `KCT.Tally.read(code)` (section 6e of `index.html`) is level 0 of a luck readout. Nothing in the app calls it yet, and it is not in the README on purpose.

It replays a code or record and returns, for each deal, the fitted value of what each seat held: `dealt` (the best 7 of its 10 cards) and `kept` (the 7 it kept), by seat (0 is you). The value is `Dynamic.bestEstimate`: expected tricks plus 0.9 × expected King points, in the seat's best suit. It also returns `totals` and each seat's `share` of the table's total, over the scored hands only. A Joker redeal and an abandoned hand are listed and not counted. A game that ended inside a hand counts that hand.

Limits:

- **It says how strong a hand was, not how many points it was worth.** It leaves out the kitty, the trump that was named and the other seats' play.
- **The fit is rough.** See Validation: strength explains only part of the points.
- **A share is not points.** A seat's share times the points scored in the game would split them in proportion. That is not calibrated, so it is not computed.

First reading, Shark 11 (seed 437250166 for the AI game, the same deals in your game): you were dealt 31% of the table's strength and Lou 36%, in a game you lost 8–10 to Lou. The AI that played your seat on the same deals got 29% and won 10–8. Both games dealt your seat the weakest hands, so the loss was partly the deal.

### Validation (2026-10-31)

`node tests/tally.js 300 4` plays 300 bot games (three default personalities at each table) and compares each seat's kept value with the points it scored. 299 games, 2,813 scored hands, 8,439 seat-hands:

| Measure | Result |
|---|---|
| Points of a seat-hand against its kept value | r 0.26, R2 0.07, slope 0.21 points per unit |
| The same within the hand (strength minus the table mean) | r 0.30, R2 0.09 |
| Mean points by kept value: below 3, 3-4, 4-5, 5-6, 6 and up | 0.36, 0.64, 0.84, 1.02, 1.16 |
| Mean points of the strongest, middle and weakest seat in a hand | 1.02, 0.72, 0.46 |
| Game level: a seat's share of the table's strength against its share of the points | r 0.39, R2 0.15, slope 1.6 |

What it says:

- **The direction is right and steady.** The points rise with each step of strength, and the strongest seat scores more than twice the weakest.
- **It explains little.** Strength explains about 7% to 9% of a hand's points and about 15% of a game's points share. The rest is the kitty, the trump that was named, who called and how the hands were played.
- **A game's deal is worth about 0.6 points.** A swing of one standard deviation in the table's strength moves a seat's points by about 0.6 of 10. So the Shark 11 deal below, 31% against 36% for Lou, is worth about 1 point of the 2-point loss, not all of it.
- **Level 0 is a guide, not a verdict.** A reading as a share of the strength is safe. A reading as luck, or in points, needs a better model. Level 1 (rollouts) is the next step, and it costs minutes per game.

## Awards: how you did with your cards (2026-10-31)

The first step of performance recognition. At the end of a game, `KCT.Awards.read(code)` (section 6f of `index.html`) grades how well your seat chose with the cards it was dealt. With `!dev awards=on` (see [tests/README.md](../tests/README.md#dev-commands)), the game-over box shows the grade as a heavy stroke in one of 7 colors, which fades in once it's worked out. It's a dev feature: off for a new install, and nothing else uses it.

The grade is never your score. Each of your choices costs the value of the best option less the value of the one you chose, in expected tricks plus 0.9 × King points. A choice that was the best option costs 0. The grade is the mean cost per choice:

- **A card in a main trick:** with every hand face up, the most your seat could still take after each card you could have played, your two opponents defending together. The kitty, the trump and how the cards split are the same for every option, so only the choice counts.
- **A discard, the trump you name, and the cards you give in the exchange:** the fitted hand estimate (`Dynamic.handEstimate`) of the best option against yours.

A discard's cost counts at `DISCARD_WEIGHT` (0.1): the estimate often disagrees with sound discards, and at full weight it ranks Casual bots below Novice ones, which win less (see Validation). Bids and Showdown play aren't graded.

Terms:

| Term | Meaning |
|---|---|
| Award | The grade of one seat in one finished game: its band, its mean cost per choice, and each part. `Awards.read(code, seat)`. |
| Band | The award's step, 6 (best) to 0 (worst), and its color on the award stroke. |
| Choice | A decision that is graded: a card played in a main trick with more than one legal card, a discard, the trump you name, or the cards you give in the exchange. |
| Best option | Of the options a choice had, the one with the most value. |
| Cost | The value of the best option less the value of the option chosen. Never below 0. |
| Mean cost per choice | The costs of a seat's choices added up (a discard's at `DISCARD_WEIGHT`), over the number of choices. The award's number: lower is better. |
| `DISCARD_WEIGHT` | How much a discard's cost counts in the mean: 0.1. Chosen so that the grade orders the bot tiers as their win rates do. |
| Value | Expected tricks plus 0.9 × King points, the unit of Tally and `Dynamic.handEstimate`. |
| Hindsight solver | `Awards.solver`: the value of a card in a main trick with every hand face up, the seat choosing for the most and both opponents for the least. |
| Defend together | How the hindsight solver plays the opponents: as one side against the graded seat. |
| Part | The cost and count of one kind of choice: cards, discards, trump or exchange. The `AWARD` line of the event log lists them. |
| `EDGES` | The mean costs where bands 5 to 0 start. Fitted by `tests/awards.js`. |
| Award stroke | The colored border of the game-over dialog while awards are on (see [vocabulary](ui/vocabulary.md#36-game-over-dialog)). |

`EDGES` cut the mean cost into bands 6 (best) to 0. They're fitted on bot games of every tier, so that 5, 12, 20, 26, 20, 12 and 5% of seat-games fall in bands 6 to 0.

| Band | Color token | Mean cost per choice |
|---|---|---|
| 6 | `--award6` neon green | below 0.038 |
| 5 | `--award5` green | 0.038 |
| 4 | `--award4` yellow-green | 0.067 |
| 3 | `--award3` yellow | 0.097 |
| 2 | `--award2` orange | 0.135 |
| 1 | `--award1` red-orange | 0.176 |
| 0 | `--award0` neon red | 0.228 and up |

### Validation (2026-10-31)

`node tests/awards.js 1300 4 9191 fit.json` fits the edges on 1,300 games. `node tests/awards.js 600 4 5150 check.json` checks them on 600 other games (1,800 seat-games). The test for `DISCARD_WEIGHT` is that the bot tiers come out in the order of their win rates, in both samples:

| Discard weight | Novice | Casual | Club | Shark | Order (fit, check) |
|---|---|---|---|---|---|
| 0 | 0.127 | 0.115 | 0.115 | 0.092 | wrong, wrong |
| **0.1** | **0.134** | **0.129** | **0.119** | **0.095** | **right, right** |
| 0.15 | 0.138 | 0.137 | 0.121 | 0.097 | right, right by 0.001 |
| 0.25 | 0.145 | 0.151 | 0.124 | 0.100 | right by 0.000, wrong |
| 1 | 0.197 | 0.261 | 0.153 | 0.127 | wrong, wrong |

The costs are the check's mean cost per choice. The win rates are 18, 25, 35 and 52%.

With `DISCARD_WEIGHT` 0.1, on the check:

| Measure | Result |
|---|---|
| Seat-games in bands 6 to 0 (target 5, 12, 20, 26, 20, 12, 5%) | 6.0, 11.6, 21.4, 26.4, 18.7, 12.7, 3.2% |
| Cost against winning | r 0.02 |
| Losses in band 6 | 73 of 1,200 |
| Time to grade a seat | median 223 ms, 95% under 490 ms, most 0.8 s |

A third sample, 240 games from seed 7070, gives 4.3, 14.6, 18.6, 26.5, 20.4, 10.3 and 5.3%. [tests/data/award-codes.txt](../tests/data/award-codes.txt) holds one code per band from it. Its band 1 code is a game that seat won.

What it says:

- **The result doesn't matter.** Winners' and losers' costs are the same, and a loss reaches neon green as often as any game. A game the deal decided grades on its choices.
- **It ranks the tiers.** Sharks cost least, then Club, Casual and Novice bots, the order of their win rates. Discards carry skill too, but at more weight the estimate's view of Casual discards turns the order over, so they count little.
- **It's fast.** Grading your seat takes about 0.2 seconds (at most about 2), in slices, so the table never stalls.

Limits:

- **Hindsight is face up.** A card that was right on what you could see can cost something when every hand is shown. Every seat pays that, so the bands allow for it.
- **The two opponents are taken to defend together.** Real bots don't, so the solver is strict.
- **The estimate grades discards, trump and exchange.** It leaves out the kitty and the play, so it can call a sound discard poor.
- **The player sees only the color.** No words, numbers or hover text explain the stroke. For development, the event log's `AWARD` line has the band, the mean cost and each part, and `KCT.Awards.read(code)` gives them for any replay code.
- **Adjacent colors are close for color-blind players.** With no words on the box, that is not solved yet.

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

## Summary

The Rules lens is solid. The human model, Real table, captures caution but not the reckless bluffing we see. For bot strength, hunches is the setting that counts. The game's hand value ranks hands well, but its numbers run high.
