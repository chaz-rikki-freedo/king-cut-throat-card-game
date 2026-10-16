# Strategic depth

A design note, not a spec. It reviews where the game asks a player to make real choices, and whether those choices stay interesting at a strong level of play. Each part says whether it is an observation, a hypothesis, a measurement or a proposal, as in [human-play.md](human-play.md).

Started 2026-10-16. It grew out of a question from play: is losing a trick on purpose, to force a Showdown, a real tactic?

## Summary

- **The game has depth in four places:** the blind discard, the bid, the gift to the player left of the caller, and the 3–3–1 Showdown.
- **A player with a weak hand still has choices.** Losing a trick on purpose can turn a 3–2–2 hand into a 3–3–1 Showdown. That takes the leader's point away and lets the weak player pick who leads the Showdown. In a three-player game, this is also kingmaking: a player who can't win the hand decides who gains.
- **Seat order matters more than skill gaps suggest.** The gift always goes to the caller's left, so the same two bots make a wave of 35% or 18% depending on which side each one sits (Waves 11 and 15).
- **Calling is cheap.** A failed call costs no points. The gift is the only price, so the bid is mostly a decision about who gets the gift.

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
- *Hypothesis:* with no cost for a failed call, the best bid for a strong player depends on the seat order more than on hand value. [human-play.md](human-play.md) shows that callers at the game's own thresholds win the hand only 22% of the time, and that raising the thresholds by up to 1.0 changes no measured strength. Both fit this hypothesis.

### Card play

*Observation.* Seven tricks, three players, follow suit. The choices are the usual ones for a trick-taking game, plus two that this game adds:

- **King points.** A King that wins a trick scores +1 at once, and a losing King scores nothing. So the timing of each King is a choice of its own, apart from the race for the most tricks.
- **First to 10 wins at once,** even in the middle of a trick. A player at 9 with a King that can win is a threat on every trick, and the other two players have to spend cards against it.

### The Showdown

*Observation.* On a 3–3–1 split, the player with 1 trick mediates. The two tied players get 6 of the 12 outside cards each, discard 1, and play 5 tricks with the same trump. The winner scores +1 and the loser loses 1, but never goes below 0. With the house rule **Mediator picks the Showdown lead** (on by default), the mediator picks who leads.

So the player who did worst in the hand decides a 2-point swing between the other two.

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

## Kingmaking

*Observation.* Forcing a Showdown is kingmaking: a player who can't win the hand decides which of the other two gains. Every three-player cut-throat game has some kingmaking. This game adds a rule, the mediator's pick, that makes it explicit and gives it to one player.

Two views, and both are reasonable:

- **It's depth.** A bad hand still has a decision in it. Players who watch the score can use a weak hand to slow the leader, which keeps games close and makes comebacks more common. [human-play.md](human-play.md) argues that comebacks keep weak players engaged.
- **It's arbitrary.** The player who gains from a Showdown didn't earn it with their cards. A player near 10 can be stopped by a choice they had no part in.

The house rule switch already lets a table choose. With it off, the latest main-trick winner leads, and the mediator has no say.

## Open questions

- Does forcing a Showdown on purpose raise a player's win rate, or only change who wins? Measure with a test seat that plays for a 3–3–1 from a 3–2–2 hand.
- Should **Shrewd** bots force Showdowns more often against a player near 10? Today they pick the lower score to lead, but they don't play for the split that gives them the pick.
- With a failed call costing nothing, is there a seat order where calling every hand is the best strategy? A bot with courage far past Bold could test this.
- Does the 0 floor make players on 0 free to take risks in a Showdown that players on more points can't take?

## Proposals

1. **Measure the forced Showdown.** Add a test seat to `tests/showdown.js` that, holding 2 tricks in a 3–2–2 position, gives a trick to the other 2-trick player. Compare its win rate with the same seat that doesn't.

   *Status: open.*
2. **Teach it in the Tutorial.** The Showdown is the one rule that gives a weak hand a strong choice. A tutorial step on the 3–3–1 split and the mediator's pick would show new players that a bad hand still matters.

   *Status: open. The Tutorial is not built yet.*
3. **Show the lever in Table memory.** When a hand is one trick from a 3–3–1 split, a popup could say so, next to the trump and King counts that Table memory already adds.

   *Status: open.*
