# Strategic depth

A design note, not a spec. It reviews where the game asks a player to make real choices, and whether those choices stay interesting at a strong level of play. Each part says whether it is an observation, a hypothesis or a measurement, as in [human-play.md](human-play.md).

Started 2026-10-16. It grew out of a question from play: is losing a trick on purpose, to force a Showdown, a real tactic? Updated 2026-10-18 with discard lessons from replays, and 2026-10-26 with buying by seat.

## Summary

- **The game has depth in four places:** the blind discard, the bid, the gift to the player left of the caller, and the 3–3–1 Showdown.
- **A player with a weak hand still has choices.** Losing a trick on purpose can turn a 3–2–2 hand into a 3–3–1 Showdown. That takes the leader's point away and lets the weak player pick who leads the Showdown. In a three-player game, this is also kingmaking: a player who can't win the hand decides who gains.
- **Seat order matters more than skill gaps suggest.** The gift always goes to the caller's left, so the same two bots make a wave of 35% or 18% depending on which side each one sits (Waves 11 and 15).
- **Calling is cheap.** A failed call costs no points. The gift is the only price, so the bid is mostly a decision about who gets the gift.
- **The seat decides whether a buy pays, not the hand value.** At the same hand value, a buy scores no more than a pass. From second seat or as dealer, a buy of a good hand gains about half a point; from the dealer's left, it gains nothing (see **Buying by seat**).
- **The bots don't buy too often.** A more timid Shark wins less, and a bolder one no more. Only some weak, bold personalities overbuy, in spots that fit their profiles (see **Do the bots buy too often?**).
- **The discard holds more than the hand value counts.** In replays, strong bots overrule it. They keep trump length over lone Kings, and keep a backup suit that shares a Jack with their best suit.

## Where the choices are

### The blind discard

*Observation.* Each player discards 3 of 10 cards before the turned card shows. So the discard is a bet on which suits might become trump, not a reaction to a known trump.

- The Jacks give the discard a color structure. A Jack is a Bower in two suits, so a hand built around one color keeps more of its value whatever is turned up.
- The discards are not gone. In a Showdown, all 12 outside cards are shuffled and dealt to the two tied players. A strong card thrown away can come back to an opponent. A player who expects to mediate can throw low cards and make both Showdown hands weak.
- **Remembers discards** gives a bot knowledge of 3 of those 12 cards. A human player can't see their own discards again during the Showdown, except through the **Outside** popup.

### The bid

*Observation.* A failed call loses no points. The only price of trump is the gift: 1 known card in round 1, or 2 hidden cards in round 2, to the player left of the caller.

- **Who receives the gift decides the bid as much as the hand does.** A call that feeds a weak opponent is cheap. A call that feeds the strongest opponent is expensive.
- **Round 1 and round 2 cost differently.** A round 1 gift is the turned card, which everyone saw. A round 2 gift is 2 hidden cards, so the caller can't know what the receiver now holds.
- **Passing blocks a suit.** If everyone passes in round 1, the turned suit can't be named in round 2. A player who passes to trap an opponent into calling risks losing their own best suit.
- *Measured (2026-10-26):* with no cost for a failed call, the best bid for a strong player depends on the seat order more than on hand value. [human-play.md](human-play.md) shows that callers at the game's own thresholds win the hand only 22% of the time, and that raising the thresholds by up to 1.0 changes no measured strength. **Buying by seat** shows why.

### Card play

*Observation.* Seven tricks, three players, follow suit. The choices are the usual ones for a trick-taking game, plus two that this game adds:

- **King points.** A King that wins a trick scores +1 at once, and a losing King scores nothing. So the timing of each King is a choice of its own, apart from the race for the most tricks.
- **First to 10 wins at once,** even in the middle of a trick. A player at 9 with a King that can win is a threat on every trick, and the other two players have to spend cards against it.

### The Showdown

*Observation.* On a 3–3–1 split, the player with 1 trick mediates. The two tied players get 6 of the 12 outside cards each, discard 1, and play 5 tricks with the same trump. The winner scores +1 and the loser loses 1, but never goes below 0. With the house rule **Mediator picks the Showdown lead** (on by default), the mediator picks who leads.

So the player who did worst in the hand decides a 2-point swing between the other two.

## Discard lessons from replays

*Observation, from replays of real games (2026-10-18).* Replay playback shows every bot's hand, so a player can see what each bot threw and compare it with the game's hand value (`handValue`, in the AI section of `index.html`). Bots that aren't Real table don't discard by hand value alone. They take the 6 discards it rates best, play each one out over imagined deals, and keep the one that scores best. Three discards from hand 1 of three games show what the hand value misses.

The fitted figures come from `tests/data/handvalue-fit.json`, 600 games of three Sharks (see [human-play.md](human-play.md)).

### Trump length beats lone honors

Viv (Club player) held Q♠ J♠ 7♠, A♥ 10♥, K♣ and A♦ J♦ 10♦ 9♦, and threw J♠ 7♠ K♣. The hand value rated that discard fifth. Its first choice was all three spades, keeping the K♣.

- **A King alone in its suit is worth little.** In the fitted data, it averages about 0.04 tricks and 0.15 King points, about half of what the hand value counts. Viv can't see 23 cards, and 20 of them are in her opponents' hands, so the A♣ is with an opponent about 87% of the time.
- **Each trump past the second is worth about 0.70 tricks,** against 0.20 in the hand value. Viv kept four diamonds, with the J♦ as the Right Bower, and both Aces.
- **Either way, she kept one void.** The K♣ would have left her void in spades. The Q♠ left her void in clubs. So the real trade was a lone King for a lone Queen.

Don't keep a King for the King point alone. Keep it when it can win a trick: with its Ace, or as trump.

### A thrown card can come back

Viv's game went to a Showdown, and the K♣ came back to her from the outside pile. She won a trick with it and scored the King point. A discard is out of play only until a Showdown. A strong card can come back to an opponent, as **The blind discard** says, or to the player who threw it.

### Keep the backup suit that shares a Jack

Doc (Shark) held A♠ K♠ 8♠, Q♥ 8♥ 7♥, J♣ 10♣ and A♦ J♦. He threw 8♥ 7♥ J♦. The hand value rated that fourth, behind throwing the 10♣.

- Spades is his best suit either way, with the J♣ as the Left Bower.
- Keeping the 10♣ makes clubs the backup suit, with the J♣ as the Right Bower. Keeping the J♦ makes diamonds the backup suit. Clubs rates higher (3.54 against 3.25), and it shares the J♣ with spades.
- If spades is the turned card and everyone passes, spades is blocked in round 2. Clubs is then the strongest suit Doc can name, and as the dealer he names last.

Throwing all three hearts was also sound: it keeps both Jacks, so the hand holds a Bower in every suit. The hand value rated it third, between the other two. The three discards are within 0.06 of each other.

### Keep the higher of two low cards

Tex (Novice) held the Joker, Q♠ J♠, A♥ 10♥ 9♥, 10♣ 8♣ 7♣ and 7♦. He threw Q♠ 10♥ 7♦ and kept the 9♥.

The hand value counts every off-suit card below a Queen the same, so it rated throwing the 9♥ and throwing the 10♥ as equal. A Novice plays out only 3 imagined deals, and chance picked the 10♥. The 10♥ is never worse than the 9♥, so keep the higher card.

### What this shows

In two of the three replays, Doc and Viv, a strong bot's play-outs overruled the hand value. The discard holds more than the hand value counts: Jacks shared across suits, voids, trump length, and cards coming back in a Showdown.

## Forcing a Showdown

*Hypothesis, from play.* A player who is sure to score little in a hand can lose a trick on purpose to make a 3–3–1 split.

### When it works

The clearest case is a **3–2–2** hand: one player is on 3 tricks and two players are on 2.

| | Without the Showdown | You give a trick to the other 2-trick player |
|---|---|---|
| Split | 3–2–2 | 3–3–1 |
| The leader | +1 for the most tricks | A Showdown: +1 or −1 |
| The other 2-trick player | 0 | A Showdown: +1 or −1 |
| You | 0 | 0, and you pick the Showdown leader |

If you pick the other player to lead, and a leader wins about 55% of Showdowns (see **Measurements**), the leader's expected score for the hand drops from +1 to about −0.1. You gain about 1.1 points on the leader without scoring anything yourself.

### When it doesn't work

- **You can't take tricks away from a player.** A 4–2–1 hand becomes 3–3–1 only if the player on 4 loses a trick to the player on 2. As the player on 1, you can only help, for example by not overtrumping the player on 2.
- **Don't give away a King.** A trick won by your King scores +1. Losing that trick on purpose costs you the point.
- **The 0 floor changes the swing.** A Showdown player on 0 can't lose a point. Forcing a Showdown against a player on 0 helps them more than it hurts.
- **First to 10 wins at once.** A Showdown can end the game. Don't force one when the player you're working against needs only 1 point and is likely to win it.

### Who else can do it

*Observation, from the code.* **Plans showdowns** (AI knowledge) lets a bot play for a Showdown. When it's off, the bot always tries to take tricks. Club player and Shark bots have it on. Casual and Novice bots don't, so they never lose a trick on purpose. In Wave 15, Vex can force a Showdown and Lou can't.

## Measurements (2026-10-16)

From `tests/showdown.js`: 300 games per table, every game with **Mediator picks the Showdown lead** on. Results are accurate to about ±5 points for win rates and ±4 points for the combined Showdown leader rate.

| | Three Sharks | Wave 15 |
|---|---|---|
| Complete hands | 2,480 | 2,513 |
| 3–3–1 splits | 11.8% | 13.9% |
| Showdowns played to the end | 11.0% | 13.3% |
| 3–2–2 splits, one trick from a Showdown | 14.3% | 15.4% |
| The Showdown leader wins | 55.5% (274 Showdowns) | 54.2% (334 Showdowns) |
| The mediator was the caller | 9.1% | 16.8% |
| Game wins, seat 0 / West / East | 31.3% / 35.7% / 33.0% | 15.0% / 65.7% / 19.3% |

Wave 15 here seats a Casual, Real table bot in seat 0, Vex (West) and Lou (East). "Showdowns played to the end" is lower than the 3–3–1 rate because a game can end at 10 before its Showdown is played.

What the numbers show:

- **About 1 hand in 8 is a Showdown,** about once per game. Another 1 hand in 7 is a 3–2–2, one trick away from one.
- **Leading the Showdown is worth a little.** The two tables together give 54.8%, with a 95% margin of about ±4 points. The mediator's pick matters, but it isn't decisive.
- **Light calls make more mediators.** In Wave 15, the caller was the 1-trick mediator in 1 Showdown in 6, against 1 in 11 for three Sharks. *Hypothesis:* Vex's Bold calls explain the difference.
- **The seat order is fair at a table of equals.** Three Sharks win about a third each. The Wave 15 numbers come from the opponents, not the seats.

Not measured: how often a 3–2–2 hand could have been turned into a 3–3–1 by the player who chose to, and what that does to a player's win rate. That needs a test seat that plays for the Showdown on purpose.

## Buying by seat (2026-10-26)

*Measurement.* Buying trump is the bid's call: in round 1, accept the turned suit; in round 2, name another suit. Each player gets one chance per round, from the dealer's left, the dealer last. The question: at the same hand value, does a buy score more points than a pass, and does the seat change the answer?

From `tests/buying.js`: 600 games of three Sharks, 5,621 hands. Each buy or pass is logged with the player's hand value (`AI.handValue`) in the suit on offer, their seat, and the points they scored that hand, King points and the Showdown included. Margins are 95%.

### Round 1, by hand value

| Hand value | Points after a buy | Points after a pass | Buy rate | Left-hand opponent's points after a buy |
|---|---|---|---|---|
| Under 2 | 0.08 ±0.07 | 0.23 ±0.02 | 3% | 1.77 |
| 2–3 | 0.38 ±0.07 | 0.48 ±0.03 | 11% | 1.34 |
| 3–4 | 0.84 ±0.05 | 0.85 ±0.04 | 41% | 0.93 |
| 4–5 | 1.39 ±0.04 | 1.44 ±0.09 | 76% | 0.54 |
| 5 and up | 2.08 ±0.06 | 2.26 ±0.29 | 91% | 0.23 |

### Round 1, by seat (hand value 3–5)

| Seat | Points after a buy | Points after a pass | Gain from buying |
|---|---|---|---|
| Dealer's left (speaks first) | 1.15 ±0.06 | 1.26 ±0.06 | −0.11 |
| Second | 1.12 ±0.05 | 0.60 ±0.06 | +0.52 |
| Dealer (speaks last) | 1.18 ±0.05 | 0.64 ±0.11 | +0.54 |

### Round 2

Round 2 is rarely a decision. At hand values of 3 and up, 98% to 100% of round 2 turns were buys, so the first player to speak, the dealer's left, almost always names trump. Of 818 round 2 buys at hand value 3 to 5, 806 came from that seat. The dealer almost never gets a turn in round 2.

### What the numbers show

- **At the same hand value, a buy scores no more than a pass.** With a weak hand it scores less: the gift feeds the left-hand opponent more than trump helps the buyer.
- **The seat decides.** A pass from the dealer's left keeps two chances: the gift when the dealer buys, and first choice of trump in round 2. A pass from second seat or as dealer hands that choice to the dealer's left, and costs about half a point.
- **So the bid thresholds can't show skill.** They ignore the seat, which is why raising them changed no measured strength.
- **The free buy is part of the design.** A penalty for a failed buy would blunt the seat trade-off, which is the decision's real content.

Whether the bots buy too often is measured in the next section. The bots chose when to buy, so buyers and passers at a hand value are not random groups; a Shark that passes a 4-value hand may have seen a weakness the hand value misses. The seat gap (about 0.5 points) is much larger than the buy-or-pass gap at any hand value, so the seat finding holds. Round 2 values use the player's best suit that is not blocked, not always the suit named.

## Do the bots buy too often? (2026-10-26)

*Measurement.* Two tests, both against the same rule set out first: the bots overbuy if passing beats buying in some spot **and** a more timid bot wins more games.

### One hand at a time: the other choice

From `tests/overbuy.js`: 1,500 hands at a table of three Sharks, and 1,500 at tables of three different personalities. Each hand is the first of a new game (scores 0–0–0). For every buy or pass, the hand is rebuilt from that turn, the other choice is played, and the same bots finish it. The bots are deterministic, so the two versions differ only by that choice. *Net gain* is the player's points minus the mean of the opponents', for the choice made over the other. Margins are 95%.

| Buys | Sharks | Personalities |
|---|---|---|
| All | +1.11 ±0.09 | +0.72 ±0.09 |
| Round 1, dealer's left | +0.36 ±0.20 | **−0.09 ±0.15** |
| Round 1, second seat | +0.86 ±0.18 | +0.55 ±0.17 |
| Round 1, dealer | +1.50 ±0.15 | +1.41 ±0.18 |
| Round 2 | +1.60 ±0.18 | +1.47 ±0.19 |
| Hand value under 2 | +0.18 ±0.57 (11 buys) | **−0.36 ±0.20** (64 buys) |
| Hand value 2–3 | +0.25 ±0.23 | −0.01 ±0.23 |

| Passes | Sharks | Personalities |
|---|---|---|
| All | +0.39 ±0.05 | +0.27 ±0.06 |
| As dealer | +0.02 ±0.14 | −0.14 ±0.17 |

- **Sharks don't overbuy.** Their buys beat passing in every seat and at every hand value.
- **Some personalities overbuy, in two spots only:** round 1 from the dealer's left, and very weak hands. The bots with the lowest gain from their buys are Gus (+0.23 ±0.23), Zen, Tex and Kit; Doc, Viv and Mei gain the most (+1.26 to +1.34). Those are weak, bold or Real table bots, and the overbuying fits their profiles.
- **A pass as dealer is break-even.** It hints that dealers pass a little too often, but within the margin.

### Whole games: a more timid Shark

From `node tests/levers.js courage 300 4`: one Shark with a changed bid courage bias (the win chance added to a buy when it plans its bid) against two normal Sharks, 300 games per setting, the same deals and seats for each.

| Bias | Buy rate | Win rate | Score share |
|---|---|---|---|
| +0.05 | 57.5% | 36.7% ±5.5 | 33.7% |
| 0 (a normal Shark) | 41.7% | 36.0% ±5.4 | 33.4% |
| −0.025 | 36.3% | 34.0% ±5.4 | 32.7% |
| −0.05 | 30.0% | 29.0% ±5.1 | 31.2% |
| −0.075 | 25.0% | 25.7% ±4.9 | 30.2% |
| −0.10 | 20.1% | 23.7% ±4.8 | 28.5% |
| −0.15 | 11.6% | 20.3% ±4.6 | 25.9% |
| −0.10, dealer's left only | 33.4% | 35.0% ±5.4 | 32.3% |

- **A more timid Shark loses, step by step.** Every cut in courage lowers both the win rate and the score share.
- **A bolder Shark is no worse.** At +0.05 it buys 16 points more often and wins the same, within the margin. Past the normal setting, extra buys cost about nothing.
- **Timid only as the dealer's left changes nothing measurable.** The weak spot in the single-hand test is too small to show in whole games.

### Verdict

**The bots don't buy too often.** The rule's second half fails: a more timid Shark wins less, not more. The normal Shark sits at or near the best courage, and the curve is flat above it, so buying a little too much is cheap and buying too little is expensive.

The personalities that overbuy in the single-hand test (Gus, Zen, Tex, Kit) are the weak and bold ones, as their profiles say. That is part of what makes them easier, so it stays.

Not measured: hands late in a game, where **Watches score** changes how the bots buy. `tests/overbuy.js` plays only the first hand of each game.

## Kingmaking

*Observation.* Forcing a Showdown is kingmaking: a player who can't win the hand decides which of the other two gains. Every three-player cut-throat game has some kingmaking. This game adds a rule, the mediator's pick, that makes it explicit and gives it to one player.

Two views, and both are reasonable:

- **It's depth.** A bad hand still has a decision in it. Players who watch the score can use a weak hand to slow the leader, which keeps games close and makes comebacks more common.
- **It's arbitrary.** The player who gains from a Showdown didn't earn it with their cards. A player near 10 can be stopped by a choice they had no part in.

The house rule switch already lets a table choose. With it off, the latest main-trick winner leads, and the mediator has no say.
