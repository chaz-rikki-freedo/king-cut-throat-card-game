# King Cut-Throat: notes for working on this repo

Read this first. It holds what is already known about the game, so you don't re-derive it or re-run simulations to find it out.

## The project

A three-player trick-taking card game in one file, `index.html` (rules engine, bots, UI). `tests/` holds Playwright scripts that drive the page, plus a few that measure the game. `docs/` holds design notes; start at [docs/README.md](docs/README.md).

## The rules, as the engine enforces them

- **Cards and deal.** 33 cards: 7 to Ace in four suits, plus the Joker. Each player gets 10 and 3 go to the kitty. Each player discards 3 face down before bidding, leaving 7.
- **Trump order.** Joker, Right Bower (Jack of trump), Left Bower (other Jack of the same color), A, K, Q, 10, 9, 8, 7.
- **Naming trump.** The dealer turns the top kitty card. *Round 1:* in turn from the dealer's left, accept its suit or pass. The turned card goes to the player left of the namer, who discards 1. *Round 2:* name a different suit or pass. The 2 face-down kitty cards go to the player left of the namer, who discards 2. If all pass, the hand is abandoned.
- **Seats** are counted from the dealer: seat 0 is the dealer (bids last), seat 1 bids first and leads, seat 2 bids second. The dealer rotates every hand.
- **Play.** 7 tricks, follow suit.
- **Scoring.** A King that wins a trick: +1 at once. Most tricks: +1. Namer takes all 7: +2. Non-namer takes all 7: +3. First to 10 wins at once, even mid-trick.
- **Showdown.** On a 3–3–1 split the 1-trick player mediates: the 12 outside cards are shuffled and 6 go to each tied player, who discard 1 and play 5 tricks. Winner +1, loser −1, never below 0. With the house rule **Mediator picks the Showdown lead** (on by default) the mediator picks who leads.
- A failed call costs no points. The price of naming is what it gives up (see the findings below).

## Code and test interfaces

- In the page: `KCT.{Engine, AI, Rules, buildView}`. `Engine.createGame(seed, names, rules, { mediatorLead })`, then `Engine.dispatch(state, action)` returns `{ ok }`. `Engine.actors(state)` lists who acts, and `Engine.systemAction(state)` gives the automatic step. Actions: `BID {accept}`, `NAME {suit | null}`, `EXCHANGE {cards}`, `DISCARD`, `PLAY`.
- **State is plain data.** Copy a hand at any point with `JSON.parse(JSON.stringify(state))` and play both branches. This is how `tests/namer.js` gets paired comparisons.
- **Bots.** `AI.fastAction(state, seat, cfg)` is the rule-based action. `AI.decide(view, cfg)` is full play (slow). `AI.personaConfig({ tier, courage, realTable, leadPick })` builds a config.
- **Two hand-value scales. Check which one a number is on.**
  - `AI.handValue(hand, trump)`: expected tricks plus 0.9 × expected King points. The bots bid on it. In round 1 they use `round1Value = handValue − 0.85 × (value of the turned card)`, which prices the gift. Bars: round 1 3.05, round 2 2.95 (2.7 for the dealer), plus a courage offset (timid +1, cautious +0.5, normal 0, bold −0.4).
  - The **fitted estimate** (`tests/data/handvalue-fit.json`): used by the reads and the Dynamic review. Its bars sit at about 1.9 to 2.3. Don't mix the two.
- **Running tests.** `cd tests && npm install`. In the cloud container set `PW_CHROMIUM=/opt/pw-browsers/chromium`. `tests/README.md` lists every script and its run time. `tests/lib/browser.js` has `serve`, `launch`, `openPage` and `run`; copy the pattern in `tests/showdown.js` or `tests/namer.js` for a new measurement. The machine has 4 cores: about 1,500 deals of `namer.js` take a minute.

## What is known

Labels: **measured** (a run, with a margin), **inferred** (reasoned from measurements), **hypothesis**. All results are for bots (three Sharks unless noted), rule-based play after the bid, every hand starting at 3-3-3. Nothing is known yet about humans or score pressure.

| Finding | Number | Status | Source |
|---|---|---|---|
| Round 1: naming starts to pay at a hand value of | 3.4 (dealer 3.0, second bidder 3.3, first bidder 4.2) | measured | [naming-trump-cost.md](docs/naming-trump-cost.md) |
| The bots' round 1 calls vs passing | +0.69 points (first seat only +0.17) | measured | same |
| Round 2: naming vs passing | +1.10 points, positive at every hand value | measured | same |
| Naming earns the same in round 1 and round 2; passing earns 3–4× less in round 2 | e.g. 0.93 vs 0.92 at hand value 3.5–4 | measured | same |
| The player's own round 2 chance is worth | 0.15 points per round 1 bid; 0.44 for the first bidder; 0 for the dealer | measured | same |
| The gift costs the namer | 0.15 points per round 1 bid, 0.10 per round 2 bid | measured | same |
| The +2 vs +3 namer sweep rule costs | about 0 (a namer sweeps in about 5% of hands) | measured | same |
| The first bidder's whole-hand points vs the other seats | ahead with rule-based play (0.90 vs 0.75); within noise under full Shark play | measured, unsettled | same |
| Hands that end in a Showdown | about 11%; the leader wins 55% (±4) | measured | [strategic-depth.md](docs/strategic-depth.md) |
| Three Sharks, game wins by seat | 31 / 36 / 33% (±5) | measured | same |
| Callers at the fitted thresholds win the hand | 22% | measured | [human-play.md](docs/human-play.md) |

**A correction to remember.** An earlier draft of the naming note said the bots name too early, at a bar of 1.9 to 2.3. That bar is on the fitted scale, not on `AI.handValue`. On the scale the bots bid on, their effective round 1 bar is above the break-even and their calls gain. The remaining leaks are small: round 1 passes at a hand value near 3.6 (about +0.2), round 2 passes (about +0.13), and first-seat calls that gain only 0.17.

## Answering without simulating

Use the model first: `node tests/lib/naming-model.js <handValue> [round] [seat]` gives the gain from naming, its margin, the break-even, the value of the player's own round 2 chance and the effect of the two rule variants. `node tests/namingmodel.js` checks the model and says if `index.html` changed in a way that makes it stale.

- **How good is it?** About ±0.03 points on data like its own. About ±0.07 when applied to natural play, where earlier bidders did not pass by force.
- **Run a new simulation when** the question is outside what the model covers: a rule or bot change (the check will flag it), humans, score pressure, a different table of bots, or full-strength play at precision. Then refit: `tests/fit-naming-model.js`.

## How to measure

- **Pair the comparison.** Copy the state at the decision and play both branches on the same deal. A per-bid margin is about 1.2 points, so a ±0.03 margin needs about 1,500 bids per bin.
- **Say what was measured and what was inferred.** Don't call a cause "measured" because it fits. The round 2 chance was *inferred* from the round comparison, and only then *measured* by barring it.
- **Check the scale** (see above) and the selection: bots call on strong hands, so a caller's average points overstate what calling adds. Use forced scenarios or paired branches.
- **Report the sample.** Give bids, deals and the margin with every number.

## Conventions

- Develop on the branch you are given; open a draft pull request after pushing.
- **Don't put Claude session links or session data in commits, pull requests or comments.**
- Docs: sentence-case headings, short sentences, a plain summary first, and an *Observation*, *Hypothesis* or *Measurement* label on every claim, as in the existing notes.
- Keep `tests/README.md` current when you add a script.
