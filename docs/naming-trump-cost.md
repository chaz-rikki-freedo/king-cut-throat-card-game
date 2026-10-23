# Naming trump: what it costs

A design note, not a spec. It measures what a player gains or loses by naming trump instead of passing, and why. Each claim is labeled an *observation*, a *hypothesis* or a *measurement*, as in [human-play.md](human-play.md). Started 2026-10-23.

It began as a question about [strategic-depth.md](strategic-depth.md), which called calling cheap because a failed call costs no points. The measurements say the price is real. It is not points lost on a failed call. It is what a player gives up by naming.

## The short version

- **Naming is a bet on your hand, and the price depends on your seat.** In round 1, the first bidder should name only with a strong hand. The dealer can name with an average one.
- **Two things make it dear, about equally: the wait and the gift.** Naming in round 1 gives up your chance to name in round 2. It also hands a card to the player on your left. The +2 against +3 sweep rule costs almost nothing.
- **Round 2 is cheap.** There is no second chance to give up, so naming paid at every hand value we measured.
- **The bots already get this about right.** When the bots' own rule says "name", naming beats passing by 0.69 points. The leaks are small.
- **No seat is stuck.** The dealer rotates every hand, so each player takes each seat in turn. This is about how to bid, not about fairness.

## Rules of thumb

*Measurement.* Hand value is `AI.handValue`: roughly the tricks a hand should win plus a bonus for Kings. About 4 is a strong hand, 3 a middling one and 2 a weak one.

| Your seat in round 1 | Name when hand value is at least | Naming beats passing by, at hand value 4 | At hand value 5 |
|---|---|---|---|
| Dealer (bids last) | 3.0 | +0.76 | +1.53 |
| Second to bid | 3.3 | +0.48 | +1.12 |
| First to bid | 4.2 | −0.10 | +0.47 |

In round 2, naming paid at every hand value measured: +0.30 points at a hand value of 3, and more above that.

## Why naming costs

*Measurement, forced run, round 1.* Points per bid that the namer would gain if each cost were removed.

| Cost | What it is | Worth | Where it falls |
|---|---|---|---|
| **The wait** | Passing keeps your chance to name in round 2 | 0.15 on average | First bidder 0.44; second 0.13; dealer 0 |
| **The gift** | The player on your left gets the turned card | 0.15 (round 2: 0.10) | 0.07 at weak hands, 0.2 at middle ones |
| **The +2 sweep** | A namer sweep scores +2, a non-namer sweep +3 | about 0 | Namers sweep in only 5% of hands |

The first two overlap, because the same pass that keeps the round 2 chance also keeps the chance to receive the gift. So they do not add up exactly.

## How the bots do

*Measurement.* The bots do not bid on the raw hand value. In round 1 they bid on `round1Value`, which subtracts 0.85 times the value of the turned card. That prices the gift. Their bars are 3.05 in round 1 and 2.95 in round 2 (2.7 for the dealer), plus a courage offset.

| Round 1 | |
|---|---|
| Bids where the bot's rule says name | 32% |
| Hand value of those hands | median 4.3; middle 80% from 3.6 to 5.4 |
| Naming vs passing on those hands | **+0.69** (±0.02) |
| Naming vs passing on the hands the bot passes | −0.19 (±0.01) |
| When the bot names, by seat: dealer / second / first | +1.07 / +0.77 / +0.17 |

The bot's rule sorts hands well. The leaks are small:

- **The first seat.** The bot uses one bar for all seats. First-seat calls still gain, but only 0.17.
- **Round 1 passes near a hand value of 3.6.** Naming would have gained +0.21 (448 of 23,337 bids).
- **Round 2 passes.** In 5.8% of round 2 bids the bot passes where naming would gain +0.13 (1,349 bids).

*Correction.* An earlier draft of this note said the bots name too early, at a bar of about 2, and that this loses points. That bar belongs to the *fitted* hand estimate used by the Dynamic review, not to the scale the bots bid on. The draft was wrong.

## The evidence

All runs use `tests/namer.js`: three Sharks, every hand starting at 3-3-3 so that the 0 floor and the first-to-10 end never cut a score. At each bid the hand is copied and played twice on the same deal, once with the bidder naming and once passing. The **gain from naming** is the bidder's hand points when naming minus the points when passing.

| Run | Deals | Bids | Play after the bid |
|---|---|---|---|
| Natural (stops at the first call the bot would make) | 8,000 | 18,152 | Rule-based |
| Forced (every bidder passes in turn, both rounds) | 8,000 | 46,674 | Rule-based |
| Forced, with each rule variant | 6,000 | 35,040 | Rule-based |
| Forced, with the round 2 chance barred | 6,000 | 17,430 | Rule-based |
| Natural, full Shark play | 389 | 911 | Shark play-outs |
| Forced, full Shark play | 433 | 2,598 | Shark play-outs |

### Round 1: gain from naming by hand value and seat

*Measurement, forced run, read from the fitted table.* Margins are ±0.01 to ±0.03.

| Hand value | All seats | Dealer | Second | First |
|---|---|---|---|---|
| 2 | −0.22 | −0.15 | −0.21 | −0.30 |
| 2.5 | −0.22 | −0.11 | −0.19 | −0.37 |
| 3 | −0.18 | 0.00 | −0.10 | −0.43 |
| 3.5 | +0.07 | +0.33 | +0.17 | −0.34 |
| 4 | +0.41 | +0.76 | +0.48 | −0.10 |
| 4.5 | +0.71 | +1.12 | +0.79 | +0.17 |
| 5 | +1.05 | +1.53 | +1.12 | +0.47 |
| **Break-even** | **3.4** | **3.0** | **3.3** | **4.2** |

### Round 1 against round 2

*Measurement, forced run.* The bidder's average hand points if they name and if they pass.

| Hand value | Round 1 name / pass | Round 2 name / pass |
|---|---|---|
| under 2 | 0.12 / 0.30 | 0.04 / 0.03 |
| 2 to 2.5 | 0.22 / 0.46 | 0.15 / 0.04 |
| 2.5 to 3 | 0.36 / 0.57 | 0.31 / 0.09 |
| 3 to 3.5 | 0.56 / 0.72 | 0.55 / 0.14 |
| 3.5 to 4 | 0.93 / 0.66 | 0.92 / 0.19 |
| 4 and up | 1.69 / 0.83 | 1.71 / 0.30 |

- **Naming earns the same in both rounds** (within 0.08 at every hand value).
- **Passing earns 3 to 4 times less in round 2.** That is the whole difference between the rounds.
- *Hypothesis, supported by the next test:* a round 1 pass keeps the round 2 chance. A round 2 pass has nothing behind it.

### The wait

*Measurement.* A third branch has the bidder pass in round 1 and then be barred from naming in round 2. The gap to a normal pass is the value of the bidder's own round 2 chance (6,000 deals, 17,430 round 1 bids).

| Hand value | Name | Pass | Pass, no round 2 chance | Value of the chance |
|---|---|---|---|---|
| under 2 | 0.11 | 0.29 | 0.24 | +0.05 |
| 2 to 2.5 | 0.24 | 0.49 | 0.39 | +0.10 |
| 2.5 to 3 | 0.35 | 0.59 | 0.43 | +0.16 |
| 3 to 3.5 | 0.53 | 0.70 | 0.49 | +0.20 |
| 3.5 to 4 | 0.91 | 0.66 | 0.49 | +0.17 |
| 4 and up | 1.67 | 0.81 | 0.59 | +0.23 |

- **At a hand value of 3 to 4 the chance is worth 0.44 to the first bidder, 0.13 to the second and 0 to the dealer.** Without it, the first bidder's gain from naming moves from −0.34 to +0.10.
- **Why the dealer has none:** when all three pass in round 1, the first bidder names in round 2 in 91% of deals, the second in 8% and the dealer in 0.3%. A first-seat pass is in practice a delayed call.
- **It is not the whole cost.** Below a hand value of 3, naming still loses 0.07 to 0.14 against a barred pass.

### The gift and the sweep rule

*Measurement.* Each variant on the same 6,000 deals as the baseline. The table gives the change in the gain from naming (variant minus baseline), so positive means the cost was hurting the namer.

| Variant | Round 1 | Round 2 |
|---|---|---|
| No gift (the receiver hands the card back) | +0.152 ± 0.006 | +0.104 ± 0.006 |
| A namer sweep scores +3 | +0.006 ± 0.001 | +0.042 ± 0.002 |

- **No gift** raises round 1 naming by 0.07 at weak hands and 0.23 at middle ones. The break-even falls from 3.4 to about 3.0.
- **The +3 sweep** matters only for strong hands (+0.04 at 4 and up), because namers rarely sweep.
- *Caveat:* the no-gift variant also changes the pass branch. A bidder who passes while someone else names no longer receives the gift, so part of the change is the lost receiver's gain.

### Full Shark play

*Measurement.* The same tests with every bot playing the hand by full play-outs (2,598 bids). The margins are about three times wider. Rule-based figures are read from the fitted table at the same hand values.

| Hand value | Round 1, rule-based | Round 1, Shark | Round 2, rule-based | Round 2, Shark |
|---|---|---|---|---|
| about 1.4 | −0.19 | −0.17 | +0.01 | too few bids |
| about 2.5 | −0.22 | −0.22 | +0.15 | +0.17 |
| about 3.2 | −0.16 | −0.24 | +0.39 | +0.36 |
| about 3.7 | +0.26 | +0.21 | +0.70 | +0.48 |
| about 4.7 | +0.85 | +0.55 | +1.32 | +1.22 |

The direction holds. The round 1 break-even is about 3.5 under full play (3.4 with rule-based play). Strong hands gain less under full play, because the other players defend better. The first bidder still names worst: its gain from naming at a hand value of 4 and up is +0.04 (±0.16).

### The seat over a whole hand

*Measurement, unsettled.* Average hand points by seat, on hands that reach a call:

| Seat | Rule-based play (7,758 hands) | Full play (389 hands) |
|---|---|---|
| First to bid | 0.90 | 0.81 |
| Second to bid | 0.76 | 0.71 |
| Dealer | 0.75 | 0.78 |

With rule-based play the first bidder is ahead by about 0.15 points, five times the margin. With full play all three are within the margin of ±0.06. *Hypothesis:* the first bidder leads the first trick and receives the gift when the dealer names. The seat is bad at naming, not necessarily bad overall.

## What this means for a design review

*Observation.* No rule change is proposed.

- **The bid is a priced decision.** Waiting has value, and each pass spends an option. Round 2 has none left.
- **The price depends on the seat.** Because the dealer rotates, that is a skill to learn and not a fairness fault.
- **The bots are close to the break-even.** The leaks are a few tenths of a point on a small share of bids.
- **Open for a reviewer to press on:** the numbers are for bots only, with no score pressure, and the gift and the wait overlap.

## Limits

- **Bots only.** The bots read other seats as playing like themselves. Humans may bid differently.
- **No score pressure.** Every hand starts at 3-3-3. A player near 10, or far behind, faces a different price.
- **The forced run is artificial.** Every bidder is made to pass in round 1, so the other hands in round 2 are not the weak hands of a real game. The model is about 0.07 points off when applied to natural play.
- **Margins are slightly too narrow.** They count bids from one deal as independent. The differences that matter are 5 to 25 times their margins.
- **The split of the cost.** The gift and the wait overlap. A run with both removed has not been done.

## Next steps

1. Remove the gift and the round 2 chance together, to see what is left of the round 1 loss.
2. Check the bots' round 2 pass rule, which leaves about +0.13 on 5.8% of bids.
3. Measure with score pressure (start hands at unequal scores) and, if possible, with human play.

## Use the model, reproduce the runs

The fitted table is `tests/data/naming-model.json`. Look up a case without a simulation:

```sh
cd tests
node lib/naming-model.js 3.2 1 first    # hand value, round, seat (all, dealer, first, second)
node namingmodel.js                     # checks the table, and warns if index.html changed since the fit
```

To reproduce the runs (4 pages; times on 4 cores):

```sh
RAW=forced.raw node namer.js 8000 4 fast forced 0 none           # about 8 minutes
RAW=nat.raw    node namer.js 8000 4 fast natural 2000            # about 11 minutes
RAW=gift0.raw  node namer.js 6000 4 fast forced 0 gift0          # also sweep3
RAW=opt.raw    node namer.js 6000 4 fast forced 40000 none option
RAW=shark.raw  node namer.js 450 4 shark forced 20000            # about 15 minutes
node fit-naming-model.js base=forced.raw gift0=gift0.raw sweep3=sweep3.raw option=opt.raw natural=nat.raw shark=shark.raw
```
