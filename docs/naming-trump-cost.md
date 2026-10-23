# The cost of naming trump

A design note, not a spec. It measures what a player gains or loses by naming trump, and how the answer changes with the hand, the round and the seat. Each part says whether it is an observation, a hypothesis or a measurement, as in [human-play.md](human-play.md).

Started 2026-10-23. It grew out of a question: is the price of naming trump higher than "the gift to the player on your left"? The earlier notes called calling cheap ([strategic-depth.md](strategic-depth.md)).

## In plain terms

- **Naming trump is not free.** Naming is only worth it with a strong hand. With an average hand, you score more by passing.
- **How strong is "strong" depends on your seat.** The player who bids first needs the strongest hand. The dealer, who bids last, needs the weakest.
- **The bots name too early.** They use about the same bar in every seat, and the bar is too low. A bot that names with a middling hand loses about a fifth of a point each time.
- **Waiting is worth something.** The player who bids first is the *best* off over a whole hand, not the worst. That seat leads the first trick, and it gets the gift whenever the dealer names. What that seat does badly is *naming*.
- **No player is stuck in a bad seat.** The dealer changes every hand, so each player takes each seat in turn. This is about *how to bid*, not about fairness.

An example. You bid first and your hand is decent but not great. Naming trump scores you about 0.4 points less than passing and letting someone else name. Pass, and you still lead the first trick. If the dealer names, you also get a free card.

## What we measured

*Measurement, 2026-10-23.* From `tests/namer.js`: 1,463 deals, three Sharks, the bots playing each hand with the rule-based play. At every bid, the hand is copied and played twice on the same deal: once with the bidder naming trump, once with the bidder passing. Every hand starts at 3-3-3, so the 0 floor and the first-to-10 end never cut a score.

**Hand value** is the game's own score for a hand, about the tricks it is expected to win plus a bonus for King points (see [human-play.md](human-play.md)). The bots' bidding bar sits at about 1.9 to 2.3.

### Round 1: what naming adds, by hand value

"Gain from naming" is the bidder's hand points when naming, minus the points when passing. Each result has a margin of about ±0.04 to ±0.07 points.

| Hand value | Calls measured | Gain from naming (points) |
|---|---|---|
| under 1.5 | 289 | −0.13 |
| 1.5 to 2 | 283 | −0.16 |
| 2 to 2.5 | 427 | −0.24 |
| 2.5 to 3 | 436 | −0.14 |
| 3 to 3.5 | 427 | −0.09 |
| 3.5 to 4 | 312 | +0.27 |
| 4 and up | 886 | +0.95 |

Naming starts to pay at a hand value of about **3.3**. That is about 1 point above the bots' bar. At the bots' bar, naming loses about 0.2 points per hand.

### Round 1: the seat changes the bar

The seats are counted from the dealer. Seat 1 bids first, seat 2 bids second and seat 0, the dealer, bids last.

| Seat | Naming at hand value under 2.5 | 2.5 to 3.5 | 3.5 to 4 | 4 and up |
|---|---|---|---|---|
| Seat 1, bids first | −0.26 | −0.43 | −0.10 | +0.33 |
| Seat 2, bids second | −0.12 | +0.11 | +0.37 | +1.13 |
| Seat 0, the dealer | +0.04 | +0.31 | +0.81 | +1.57 |

Reading the break-even off these coarse bins (an interpolation, not a direct measurement), naming starts to pay at a hand value of about **3.8 or more** in seat 1, **3.0** in seat 2 and **2.4** for the dealer.

### Who comes out ahead over a whole hand

| Seat | Average points per hand |
|---|---|
| Seat 1, bids first | 0.92 |
| Seat 2, bids second | 0.76 |
| Seat 0, the dealer | 0.75 |

The first bidder earns the most. The gap of about 0.17 points is about four times its margin.

*Hypothesis:* two things explain it. The first bidder leads the first trick. And the first bidder sits to the left of the dealer, so that seat gets the gift when the dealer names. A player who passes in seat 1 is paid for waiting. Naming gives that up.

### Round 2

Naming looks better in round 2, at +0.95 points overall. Do not read that as a cheaper price.

- Round 2 only happens after all three players passed in round 1. So the callers there hold strong hands.
- Only 303 round 2 calls were measured, and only 20 were below a hand value of 3.5. The sample is too thin to say how round 2 compares with round 1 *at the same hand value*.
- The gift is about the same size in both rounds: the receiver's hand value rises by 0.70 in round 1 and 0.68 in round 2.

### The roles

When the bots name as they normally do, the average hand points are:

| Role | Round 1 | Round 2 |
|---|---|---|
| Namer | 1.63 | 1.38 |
| Receiver (left of the namer) | 0.58 | 0.54 |
| Third player | 0.28 | 0.29 |

The namer scores the most, but the namer chose to name because the hand was strong. That is selection, not proof that naming pays. The receiver does twice as well as the third player, which is the cost of the gift.

## Where the cost comes from

*Observation, from the code and the table above.*

1. **The gift.** The player on your left gets one known card in round 1, or two hidden cards in round 2.
2. **A smaller sweep bonus.** A namer who takes all 7 tricks scores +2. A non-namer who does it scores +3.
3. **Giving up the wait.** Passing keeps the chance to be the receiver, and keeps the lead if you bid first.

Only the gift is measured on its own (the receiver's gain above). Parts 2 and 3 are read from the rules and the seat table. A test that removes each part in turn, listed under **Next steps**, would give each one's share.

## What this means for the bots

*Observation, from the code.* The rule-based bot uses one round 1 bar for every seat. Its round 2 bar changes only for the dealer. The data says the round 1 bar should also change by seat, high for the first bidder and low for the dealer.

*Hypothesis:* a seat-aware bar would play stronger. Raising the bar would also make bots name less often, so they would be mediators in fewer Showdowns (see **Measurements** in [strategic-depth.md](strategic-depth.md)). That has not been measured.

## What we don't know

- **Humans.** All of this is bot play. The bots read other seats as playing like themselves.
- **Full-strength play.** A 60-deal run with Shark play-outs points the same way, but it is too small to confirm the numbers.
- **Score pressure.** Every hand starts at 3-3-3. A player near 10, or far behind, faces a different price.
- **Round 1 against round 2 at the same hand value.** This needs forced round 2 calls on weak hands.
- **The share of each cost.** The gift, the sweep bonus and the lost wait are not yet separated.

## Next steps

1. Re-run with full Shark play on a larger sample (slow).
2. Add forced round 2 calls on weak hands, to compare the rounds fairly.
3. Test the three costs one at a time: no gift, a +3 namer sweep, and a bar that depends on the seat.
4. Try a seat-aware bar in a bot and measure its win rate against the current bots.

## Reproduce

```sh
cd tests
node namer.js 1500 4        # about 1 minute
node namer.js 60 4 shark    # full play-outs, about 100 seconds
```
