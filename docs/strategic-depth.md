# Strategic depth

A design note, not a spec. It reviews where the game asks a player to make real choices, and whether those choices stay interesting at a strong level of play. Each part says whether it is an observation, a hypothesis or a measurement, as in [human-play.md](human-play.md).

Started 2026-10-16. It grew out of a question from play: is losing a trick on purpose, to force a Showdown, a real tactic? Updated 2026-10-18 with discard lessons from replays.

## Summary

- **The game has depth in four places:** the blind discard, the bid, the gift to the player left of the caller, and the 3–3–1 Showdown.
- **A player with a weak hand still has choices.** Losing a trick on purpose can turn a 3–2–2 hand into a 3–3–1 Showdown. That takes the leader's point away and lets the weak player pick who leads the Showdown. In a three-player game, this is also kingmaking: a player who can't win the hand decides who gains.
- **Seat order matters more than skill gaps suggest.** The gift always goes to the caller's left, so the same two bots make a wave of 35% or 18% depending on which side each one sits (Waves 11 and 15).
- **Calling is cheap.** A failed call costs no points. The gift is the only price, so the bid is mostly a decision about who gets the gift.
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
- *Hypothesis:* with no cost for a failed call, the best bid for a strong player depends on the seat order more than on hand value. [human-play.md](human-play.md) shows that callers at the game's own thresholds win the hand only 22% of the time, and that raising the thresholds by up to 1.0 changes no measured strength. Both fit this hypothesis.

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

*Hypothesis, from play.* A player who is sure to score little in a hand can lose a trick on purpose to make a 3–3–1 split. Tested on 2026-10-23: it did not raise the Showdown rate (see **Playing a weak hand when behind**).

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

Measured later (2026-10-23), see **Playing a weak hand when behind**: a weak hand that plays to lose tricks did not make a Showdown more likely.

## Playing a weak hand when behind

*Measurement (2026-10-23).* From `tests/balance.js`: 600 games of three Sharks, 3,206 hands. Each hand is one where a player who did not call trump trails the sole leader and holds a weak hand (under 2.2 expected tricks by the fitted estimate). The same deal is replayed from the first trick with the trailing player using each of six plays, and both opponents unchanged. The value of the end of the hand is the game's win-chance table (`AI.winChance`).

### In plain terms

You can't fold in this game, but you can stop trying. Playing a weak hand on autopilot, lowest card every time, costs you. Every way of actually playing it out left the leader a little less likely to win than coasting did, and left you a little more likely to.

One hand makes a small difference. But a trailing player gets about two such hands per game, and the small differences add up. In this test, a player who worked against the leader on every weak hand lowered the leader's chance of winning the game by roughly 3 points. Your own chance rises only a little, because you are still far behind.

Playing on does not stop the leader from scoring. Even against a player working to stop them, the leader scored in 59% of hands. The aim is to make them earn it.

### Results

Change from coasting, in percentage points, on the same hands. Margins are 95%.

| Trailing player plays | Leader's win chance | You |
|---|---|---|
| **Coast**: lowest legal card every time, never tries to win a trick | 0 (leader at 68.2%) | 0 |
| **Greedy**: wins every trick it can | −0.6 ±0.4 | +0.7 ±0.2 |
| **Duck**: loses tricks on purpose | −0.8 ±0.4 | +0.6 ±0.2 |
| **Balance**: takes 1 trick, then feeds the opponent with fewer | −0.8 ±0.4 | +0.6 ±0.2 |
| **Shark**: tries all three plans, keeps the best by its own win chance | −0.7 ±0.4 | +0.8 ±0.2 |
| **Deny**: Shark, but values only a lower win chance for the leader | −1.8 ±0.4 | +0.6 ±0.2 |

- **Size.** One extra point for the leader is worth 11 to 13 points of win chance in mid-game positions. Deny's gain is about 0.15 of a point per weak hand.
- **Where it comes from.** Deny took about 0.15 tricks per hand from the leader (2.82 against 2.97 when coasting). It changed the hand score in 45% of hands and lowered the leader's chance in 26% of hands. In 15% it raised it.
- **Weakest hands.** For the 1,153 hands under 1.0 expected tricks the gains were smaller: Deny −1.2, Shark −0.6.
- **The Showdown.** A Showdown came in 8.5% of hands when coasting, 8.0% when ducking, 8.1% when balancing and 8.5% when denying (each ±1.0). Playing to lose tricks did not make one more likely.
- **Who called.** When coasting, the leader gained 1.38 points per hand when it had called trump and 0.63 when the other opponent had.

### Limits

- The players are bots. How people play was not measured.
- The win chance assumes each hand's result does not depend on the scores.
- Margins treat hands as independent. Hands from one game are correlated, so the real margins are a little wider.
- 2,421 Shark branches matched the real hands exactly, so the branching does not change the game.

## Kingmaking

*Observation.* Forcing a Showdown is kingmaking: a player who can't win the hand decides which of the other two gains. Every three-player cut-throat game has some kingmaking. This game adds a rule, the mediator's pick, that makes it explicit and gives it to one player.

Two views, and both are reasonable:

- **It's depth.** A bad hand still has a decision in it. Players who watch the score can use a weak hand to slow the leader, which keeps games close and makes comebacks more common.
- **It's arbitrary.** The player who gains from a Showdown didn't earn it with their cards. A player near 10 can be stopped by a choice they had no part in.

The house rule switch already lets a table choose. With it off, the latest main-trick winner leads, and the mediator has no say.
