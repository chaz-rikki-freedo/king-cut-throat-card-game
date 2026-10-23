# The cost of naming trump

A design note, not a spec. It measures what a player gains or loses by naming trump, and how the answer changes with the hand, the round and the seat. Each part says whether it is an observation, a hypothesis or a measurement, as in [human-play.md](human-play.md).

Started 2026-10-23. It grew out of a question: is the price of naming trump higher than "the gift to the player on your left"? The earlier notes called calling cheap ([strategic-depth.md](strategic-depth.md)).

## In plain terms

- **Naming trump is not free.** In round 1, naming is only worth it with a strong hand. With an average hand, you score more by passing.
- **Two things make naming dear: giving up the wait, and the gift.** Each is worth about 0.15 points a bid, and the +2 versus +3 sweep rule is worth almost nothing.
- **Naming pays the same in both rounds.** A hand of a given strength earns the same points whether you name it in round 1 or round 2. What changes is the price of *passing*. In round 1, passing keeps a second chance to name in round 2. In round 2, passing can end the hand with no points for anyone. So the real cost of naming in round 1 is the chance you give up by not waiting. A test that removes that chance confirms this for the first and second bidder (see **The value of waiting**).
- **How strong is "strong" depends on your seat.** The player who bids first needs the strongest hand. The dealer, who bids last, needs the weakest.
- **The bots name too early.** They use about the same bar in every seat, and the bar is too low. A bot that names with a middling hand in round 1 loses about a fifth of a point each time.
- **The first bidder is bad at naming, not necessarily bad overall.** That seat leads the first trick, and it gets the gift whenever the dealer names. Over a whole hand it comes out level with the other seats, or ahead of them. What that seat does badly is *naming*.
- **No player is stuck in a bad seat.** The dealer changes every hand, so each player takes each seat in turn. This is about *how to bid*, not about fairness.

An example. You bid first and your hand is decent but not great. Naming trump scores you about 0.4 points less than passing and letting someone else name. Pass, and you still lead the first trick. If the dealer names, you also get a free card.

## What we measured

*Measurement, 2026-10-23.* From `tests/namer.js`, with three Sharks. At every bid, the hand is copied and played twice on the same deal: once with the bidder naming trump, once with the bidder passing. Every hand starts at 3-3-3, so the 0 floor and the first-to-10 end never cut a score.

| Run | Deals | Bids measured | Play after the bid |
|---|---|---|---|
| Natural | 8,000 | 18,152 | Rule-based |
| Forced | 8,000 | 46,674 | Rule-based |
| Natural, full play | 389 | 911 | Shark play-outs |
| Forced, full play | 433 | 2,598 | Shark play-outs |

- **Natural** stops at the first call the bot would make. It shows the game as bots play it.
- **Forced** makes every bidder pass in turn through both rounds. Each deal gives six bids, three in round 1 and three in round 2, so the rounds can be compared on the same deal.

**Hand value** is the game's own score for a hand, about the tricks it is expected to win plus a bonus for King points (see [human-play.md](human-play.md)). The bots' bidding bar sits at about 1.9 to 2.3.

### Round 1: what naming adds, by hand value

"Gain from naming" is the bidder's hand points when naming, minus the points when passing. These figures are from the natural run (16,468 round 1 bids), with margins of ±0.01 to ±0.03.

| Hand value | Bids | Gain from naming (points) |
|---|---|---|
| under 2 | 3,201 | −0.17 |
| 2 to 2.5 | 2,189 | −0.20 |
| 2.5 to 3 | 2,384 | −0.18 |
| 3 to 3.5 | 2,357 | −0.12 |
| 3.5 to 4 | 1,785 | +0.33 |
| 4 and up | 4,552 | +0.90 |

Naming starts to pay at a hand value of about **3.4**. That is more than 1 point above the bots' bar. At the bots' bar, naming in round 1 loses about 0.2 points per hand. The forced run gives the same picture (break-even 3.44).

### Round 1: the seat changes the bar

The seats are counted from the dealer. Seat 1 bids first, seat 2 bids second and seat 0, the dealer, bids last. Natural run, gain from naming:

| Seat | Hand value under 3 | 3 to 4 | 4 and up |
|---|---|---|---|
| Seat 1, bids first | −0.31 | −0.37 | +0.34 |
| Seat 2, bids second | −0.11 | +0.26 | +0.99 |
| Seat 0, the dealer | +0.13 | +0.73 | +1.52 |

Reading the break-even off these coarse bins (an interpolation, not a direct measurement), naming starts to pay at a hand value of about **4** in seat 1, **3** in seat 2 and **below 3** for the dealer.

### Who comes out ahead over a whole hand

| Seat | Average points per hand, rule-based play (7,758 hands) | Full play (389 hands) |
|---|---|---|
| Seat 1, bids first | 0.90 | 0.81 |
| Seat 2, bids second | 0.76 | 0.71 |
| Seat 0, the dealer | 0.75 | 0.78 |

With rule-based play, the first bidder is ahead by about 0.15 points, which is about five times the margin. With full play, the gaps are within the margin of about ±0.06. So the first bidder is not weak overall. Whether that seat is ahead depends on how the hand is played, and the full-play sample is too small to settle it.

*Hypothesis:* the first bidder leads the first trick, and sits to the left of the dealer, so that seat gets the gift when the dealer names. A player who passes in seat 1 is paid for waiting. Naming gives that up.

### Round 1 against round 2

*Measurement, 2026-10-23.* From the forced run (46,674 bids), which does not depend on which hands the bots would have named. For each round and hand value, the table shows the bidder's average hand points if they name and if they pass.

| Hand value | Round 1 bids | R1 name | R1 pass | Round 2 bids | R2 name | R2 pass |
|---|---|---|---|---|---|---|
| under 2 | 5,322 | 0.12 | 0.30 | 138 | 0.04 | 0.03 |
| 2 to 2.5 | 3,451 | 0.22 | 0.46 | 433 | 0.15 | 0.04 |
| 2.5 to 3 | 3,557 | 0.36 | 0.57 | 1,202 | 0.31 | 0.09 |
| 3 to 3.5 | 3,274 | 0.56 | 0.72 | 2,374 | 0.55 | 0.14 |
| 3.5 to 4 | 2,382 | 0.93 | 0.66 | 3,757 | 0.92 | 0.19 |
| 4 and up | 5,351 | 1.69 | 0.83 | 15,433 | 1.71 | 0.30 |

The gain from naming is name minus pass. In round 1 it goes from −0.18 to +0.87. In round 2 it goes from +0.01 to +1.41, and no bin is negative.

- **Naming pays the same in both rounds.** At each hand value, the points from naming are within 0.08 of each other (for example, 0.93 and 0.92 at 3.5 to 4). The gift is 1 known card in round 1 and 2 hidden cards in round 2, and the measurement shows no net difference in what it costs the namer.
- **Passing pays much less in round 2,** by a factor of 3 to 4 at the same hand value (0.14 against 0.72 at 3 to 3.5). That is the whole difference between the rounds.
- **The natural run agrees.** Round 2 minus round 1 is +0.25 to +0.54 points in each hand-value bin, with the same sign. It has only 1,684 round 2 bids, 68% of them at 4 and up.

*Hypothesis, from the rules:* a round 1 pass keeps the round 2 chance to name your best suit. A round 2 pass has nothing behind it: if all three pass, the hand is abandoned and nobody scores. So the cost of naming in round 1 is the value of waiting. In round 2 that value is gone, and naming is almost always at least as good as passing in this bot play. The next section tests it by removing the player's own round 2 chance.

Cautions:

- In the forced run every bidder passes in round 1, whatever the hand. The other two hands are therefore not weak hands, as they usually are when round 2 happens in a real game.
- A round 2 bidder names the best of three suits. That can overstate the hand's strength. If so, the round 2 curve is drawn too low and the gap is understated, not overstated. This is a hypothesis.
- The margins count bids as independent. Bids from the same deal are correlated, so the real margins are somewhat wider. The differences between rounds are 5 to 25 times their margins, so this does not change the conclusion.
- Below a hand value of 3, round 2 has few bids (138, 433, 1,202). Read those rows as a direction.

### Full-strength check

*Measurement, 2026-10-23.* The same tests with every bot playing the hand with full Shark play-outs. The natural run has 389 deals (911 bids). The forced run has 433 deals (2,598 bids; 450 were dealt and 17 had no bidding, because a Joker was turned). The margins are about three times wider than in the rule-based runs.

| Hand value | Natural: bids | Natural: gain from naming | Forced: round 1 gain | Forced: round 2 gain |
|---|---|---|---|---|
| under 2 | 171 | −0.10 | −0.17 | +0.00 (4 bids) |
| 2 to 2.5 | 109 | −0.30 | −0.19 | +0.15 |
| 2.5 to 3 | 108 | −0.24 | −0.26 | +0.19 |
| 3 to 3.5 | 123 | −0.11 | −0.24 | +0.36 |
| 3.5 to 4 | 95 | +0.05 | +0.21 | +0.48 |
| 4 and up | 219 | +0.68 | +0.55 | +1.22 |

- **Naming loses points up to a hand value of about 3.5** in round 1 (3.51 in the forced run). With rule-based play it was about 3.4.
- **Strong hands gain less under full play** in round 1: +0.55 to +0.68 against +0.87 to +0.90. The other players defend better.
- **Round 2 is never negative,** and it beats round 1 in every hand-value bin by 0.27 to 0.67 points (2.4 to 7.5 times its margin).
- **Naming pays about the same in both rounds** at 4 and up (1.51 in round 1, 1.53 in round 2). Passing pays 0.96 in round 1 and 0.31 in round 2. Between 3 and 4 the points from naming differ by up to 0.12, which is within the margins.
- **The first bidder still names worst,** and the effect is stronger under full play. Round 1 gain from naming in seat 1 is −0.32 at 3 to 4 and +0.04 at 4 and up (±0.16). Seat 2 is +0.02 and +0.56. The dealer is +0.24 and +0.94. A first bidder gets no clear gain from naming even with a hand value of 4 and up.
- **The seat gap over a whole hand shrinks.** Natural run: first bidder 0.81, dealer 0.78, second 0.71.


### The value of waiting

*Measurement, 2026-10-23.* A third branch tests the claim above. At each round 1 bid, the bidder passes and is then barred from naming in round 2. The others still bid as they would. The gap between a normal pass and this barred pass is the **value of the bidder's own round 2 chance**. Forced run, rule-based play, 6,000 deals, 17,430 round 1 bids, margins of ±0.01 to ±0.03.

| Hand value | Name | Pass (normal) | Pass (no round 2 chance) | Value of the round 2 chance | Naming minus barred pass |
|---|---|---|---|---|---|
| under 2 | 0.11 | 0.29 | 0.24 | +0.05 | −0.12 |
| 2 to 2.5 | 0.24 | 0.49 | 0.39 | +0.10 | −0.14 |
| 2.5 to 3 | 0.35 | 0.59 | 0.43 | +0.16 | −0.07 |
| 3 to 3.5 | 0.53 | 0.70 | 0.49 | +0.20 | +0.03 |
| 3.5 to 4 | 0.91 | 0.66 | 0.49 | +0.17 | +0.42 |
| 4 and up | 1.67 | 0.81 | 0.59 | +0.23 | +1.08 |

- **The round 2 chance is worth 0.15 points per hand on average** (±0.004), and 0.20 to 0.23 at a hand value of 3 and up.
- **It explains much of the round 1 loss at middle hand values.** At 3 to 3.5, naming loses 0.17 against a normal pass and is level with a barred pass. The break-even moves from about 3.4 down to about 3.
- **It does not explain all of it.** Below a hand value of 3, naming still loses 0.07 to 0.14 against a barred pass. That remainder is the gift, the smaller sweep bonus, and whatever else naming gives up, such as being the receiver.

By seat, at a hand value of 3 to 4:

| Seat | Value of the round 2 chance | Naming minus normal pass | Naming minus barred pass |
|---|---|---|---|
| Seat 1, bids first | +0.44 ± 0.02 | −0.34 | +0.10 |
| Seat 2, bids second | +0.13 ± 0.02 | +0.02 | +0.14 |
| Seat 0, the dealer | +0.00 | +0.35 | +0.36 |

- **The first bidder's whole penalty is the round 2 chance.** Remove it and naming goes from −0.34 to +0.10.
- **The dealer has no round 2 chance to give up.** In a check of 1,448 deals where all three pass in round 1, the first bidder named in round 2 in 91% of deals, the second bidder in 8% and the dealer in 0.3%. The dealer almost never gets to name in round 2. Nobody left a hand unnamed in that check, so with these bots the hand is never abandoned after three round 1 passes.
- **Why the first bidder's chance is worth so much:** passing in round 1 and then naming in round 2 is, in practice, a delayed call, with the best of the other three suits and a different gift. The bots almost always do it.

Cautions:

- This is the bidder's own chance only. The others keep theirs, and a round 1 pass still lets them name first.
- Every hand in this check is forced to pass round 1. Real round 2 hands follow three passes, so the others' hands are weaker than average.
- Bot play only, with the rule-based play after the bid. The full-strength runs above did not include this branch.

### What each cost is worth

*Measurement, 2026-10-23.* Two rule variants, each run on the same 6,000 deals as a baseline (35,040 paired bids, forced run, rule-based play). The table gives the change in the gain from naming, variant minus baseline, so a positive number means that cost was hurting the namer.

- **No gift.** The receiver hands the gift straight back, so no hand changes. The receiver still sees the card.
- **Namer sweep scores +3.** The same as a non-namer sweep.

| Hand value | Round 1 baseline gain | No gift: change | +3 namer sweep: change |
|---|---|---|---|
| under 2 | −0.18 | +0.07 ± 0.01 | −0.00 |
| 2 to 2.5 | −0.24 | +0.10 ± 0.01 | −0.00 |
| 2.5 to 3 | −0.21 | +0.14 ± 0.02 | −0.01 |
| 3 to 3.5 | −0.16 | +0.23 ± 0.02 | −0.01 |
| 3.5 to 4 | +0.26 | +0.23 ± 0.02 | −0.00 |
| 4 and up | +0.89 | +0.19 ± 0.01 | +0.04 ± 0.00 |
| Round 1, all | | +0.152 ± 0.006 | +0.006 ± 0.001 |
| Round 2, all | | +0.104 ± 0.006 | +0.042 ± 0.002 |

- **The gift is a large cost.** It is worth 0.07 to 0.23 points per round 1 bid, and 0.10 per round 2 bid. That is about as much as the round 2 chance (0.15). Without it, the round 1 break-even falls from about 3.4 to about 3.0, the same shift as removing the round 2 chance.
- **The sweep rule is not a cost in practice.** A namer sweeps in about 5% of hands, so the extra point rarely applies. It matters only for strong hands (+0.04 at 4 and up). Below a hand value of 4 it is zero.
- **The first bidder gains most from losing the gift.** At a hand value of 3 to 4, the first bidder's gain from naming moves from −0.39 to −0.13, the second bidder's from +0.14 to +0.39 and the dealer's from +0.29 to +0.47.
- **Gift and wait overlap.** The two costs together (0.15 + 0.15) are close to the whole round 1 loss at middle hand values (0.12 to 0.30 against a measured −0.18 to −0.24), but they are not additive. The same pass that keeps the round 2 chance also keeps the chance to be the receiver.

Cautions:

- The no-gift variant also changes the pass branch. When the bidder passes and another player names, the bidder no longer receives the gift. So part of the change is the loss of the receiver's gain in the pass branch, not only the namer's saving.
- The receiver sees the returned card. In round 1 that card is public anyway. In round 2 it is a small information leak.
- The sweep variant was added after the hand, to the namer's score. It does not change how the bots play.
- Rule-based play, bots only, and no round 2 chance removed in these runs.

## Where the cost comes from

*Observation, from the code and the tables above.*

1. **The gift.** The player on your left gets one known card in round 1, or two hidden cards in round 2. The receiver averages 0.59 points against 0.27 for the third player, in natural round 1 calls.
2. **A smaller sweep bonus.** A namer who takes all 7 tricks scores +2. A non-namer who does it scores +3. Measured: this costs almost nothing, because namers rarely sweep.
3. **Giving up the wait.** In round 1, passing keeps the round 2 chance, the chance to be the receiver, and the lead if you bid first. The round 2 chance is measured: it is worth 0.15 points per hand on average and 0.44 for the first bidder at a hand value of 3 to 4.

Each part is now measured (see **The value of waiting** and **What each cost is worth**). The gift and the wait are each worth about 0.15 points per bid. The sweep bonus is close to zero. The first two overlap, so they are not additive.

## What this means for the bots

*Observation, from the code.* The rule-based bot uses one round 1 bar for every seat. Its round 2 bar changes only for the dealer. The data says the round 1 bar should change by seat, high for the first bidder and low for the dealer, and should be higher overall.

*Observation:* in round 2, the data shows no hand value at which naming loses on average. A bot that passes in round 2 on a hand it could name leaves points behind. This has not been checked against the round 2 bars the bots use.

*Hypothesis:* a seat-aware round 1 bar would play stronger. Raising the bar would also make bots name less often, so they would be mediators in fewer Showdowns (see **Measurements** in [strategic-depth.md](strategic-depth.md)). That has not been measured.

## How a design review would read this

*Observation.* No rule change is proposed. Read as evidence about the game as designed:

- **The bid is a priced decision.** In round 1, naming has a measurable cost and a strong hand pays it back. A reviewer looking for a real decision at the bid will find one.
- **The price is the value of waiting plus the gift.** Naming pays the same in both rounds. Round 1 is dearer because passing keeps a second chance, worth 0.15 points per hand and 0.44 for the first bidder. The gift costs about as much again. The +2 versus +3 sweep rule costs almost nothing. That is a coherent structure: each pass spends an option, and round 2 has none left.
- **The price depends on the seat.** The first bidder pays the most, and the dealer pays the least. The dealer rotates, so no player holds a seat for long, and the asymmetry is a skill to learn and not a fairness fault.
- **The seat gap over a whole hand is unsettled.** It is clear with rule-based play and within noise under full play.
- **The weak point is the bots, not the rules.** A bot that names at a hand value of about 2 in round 1 loses points in every seat. Better bots would not require a rule change.
- **Open for a reviewer to press on:** nothing here uses human play or the score, and the gift and the wait overlap.

## What we don't know

- **Humans.** All of this is bot play. The bots read other seats as playing like themselves.
- **Score pressure.** Every hand starts at 3-3-3. A player near 10, or far behind, faces a different price.
- **The exact split.** The gift and the wait overlap, so their shares are not additive. A test of both removed together has not been run.
- **Exact full-strength figures.** The full-play samples are small, so their per-seat figures are directional.

## Next steps

1. Test the gift and the wait together (no gift and no round 2 chance), to see how much of the round 1 loss is left.
2. Try a seat-aware round 1 bar in a bot and measure its win rate against the current bots.
3. Check the bots' round 2 bars against the data above.

## Reproduce

```sh
cd tests
node namer.js 8000 4 fast natural 2000   # about 10 minutes
node namer.js 8000 4 fast forced         # about 6 minutes
node namer.js 6000 4 fast forced 40000 none option   # adds the value of waiting
node namer.js 6000 4 fast forced 0 gift0       # the no-gift variant (also: sweep3)
node namer.js 450 4 shark forced 20000   # about 15 minutes
```

`RAW=file.json` also writes one compact row per bid, for further analysis.
