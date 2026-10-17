# Puzzles: data format and loader

A design note for puzzle lessons: short, fixed positions that each teach one mechanic. So far this adds the data format, the loader, the judge and one lesson. It adds no UI. The **Tutorial** button in the menu stays disabled. The plan for the lesson pop-ups is in [ui/teacher-bubbles.md](ui/teacher-bubbles.md).

Status: format 1, loader and judge in `index.html` (the `Puzzles` module, after `Replay`). Started 2026-10-15.

## Goals

- Teach the rules by play, one mechanic per lesson.
- Add no rules and no settings. A puzzle runs on the same Engine as a real game.
- Make a broken puzzle fail a test, not a player.

## Design in one paragraph

A puzzle is a **deal** and a **script**. The deal sets the 10 cards in each hand and the 3 kitty cards. The script lists player decisions in the same form as a replay code's decision list. The loader puts the deal on the table, then plays the script through `Engine.dispatch`, which checks every step. The script stops when it is your move: that is the puzzle's start position.

The loader never writes game state by hand, except the deal. Played cards, voids, tricks won, King points and the trick in progress all come from real moves. A puzzle can start at any point of a hand: the discard, the bidding, the exchange or any trick.

## Format 1

A puzzle is one JSON object. Every field is required, except `seed`. A field the format does not name is an error, so a typo can't pass silently.

| Field | Type | Meaning |
|---|---|---|
| `format` | `1` | The format version. |
| `id` | string | Lowercase words joined by hyphens, for example `left-bower`. Progress will be kept by `id`. |
| `title` | string | The lesson name. |
| `prompt` | string | The task, shown at the start. For example, "Hearts are trump. Win this trick." |
| `lesson` | string | The rule, shown after the puzzle is solved. |
| `goal` | object | What counts as solved. See **Goals**. |
| `seed` | integer | Optional, default 1. Seeds the game's RNG. It matters only when the script reaches a Showdown, which shuffles the outside pile. |
| `dealer` | 0, 1 or 2 | The dealer. Seat 0 is you, 1 is West, 2 is East. Play goes 0, 1, 2, so the dealer's left is the next seat. |
| `scores` | 3 integers | The scores before the hand, each 0 to 9. |
| `deal.hands` | 3 lists of 10 cards | The cards dealt to seats 0, 1 and 2, before the discard. |
| `deal.kitty` | 3 cards | The kitty. The first card is the one turned up. |
| `script` | list of decisions | The player decisions from the deal to the start position. |

Cards use the game's ids: rank then suit, for example `AS`, `10H`, `JD`. The Joker is `JK`. The deal must hold all 33 cards once each.

### Script decisions

Each decision has the same fields as a decision in a replay code:

| Decision | Fields | Example |
|---|---|---|
| Discard 3 | `player`, `cards` | `{ "type": "DISCARD", "player": 1, "cards": ["8S", "7S", "10C"] }` |
| Round 1 bid | `player`, `accept` | `{ "type": "BID", "player": 1, "accept": true }` |
| Round 2 bid | `player`, `suit` (or `null` to pass) | `{ "type": "NAME", "player": 2, "suit": "S" }` |
| Exchange discard | `player`, `cards` | `{ "type": "EXCHANGE", "player": 2, "cards": ["9D"] }` |
| Play a card | `player`, `card` | `{ "type": "PLAY", "player": 1, "card": "AS" }` |
| Showdown discard | `player`, `card` | `{ "type": "SHOWDOWN_DISCARD", "player": 1, "card": "7S" }` |

System steps (the turn-up, the end of a trick, the next hand) run on their own between decisions, as in a replay.

### Goals

The loader checks each goal twice: its fields, and then whether the start position can judge it (see **Loader**). The judge decides when a goal is met (see **Judge**).

| `type` | Extra field | Solved when | Judged |
|---|---|---|---|
| `winTrick` | none | You win the trick in progress. | At the end of that trick. |
| `tricks` | `min` | You have taken at least `min` main tricks this hand. Tricks taken before the start count. Showdown tricks don't. | As soon as it is certain: solved at the `min`-th trick, failed when too few tricks are left. |
| `score` | `min` | Your score reaches `min` before the hand ends. `min` is a score, not a gain. A Showdown is part of the hand. | At each score change, and at the end of the hand. |
| `winGame` | none | You reach 10 points. | When the game ends, or at the end of the hand. |
| `decide` | `accept` | Your next decision is one of the decisions in `accept`. Discards match as a set, in any order. | At your next decision. |

`decide` is for the lessons that aren't about trick play: when to call trump, and what to discard.

## Loader

```js
KCT.Puzzles.load(puzzle)       // { ok: true, state, puzzle } or { ok: false, error }
KCT.Puzzles.shapeError(puzzle) // the first problem in the fields, or null. Does not run the script.
KCT.PUZZLES                    // the bundled lessons, in order
```

`load` never throws. It refuses a puzzle with a reason when:

- A field is missing, unknown or of the wrong type, or a card is unknown or dealt twice.
- A script step is illegal. The error names the step, for example `script step 6 (PLAY): illegal card`.
- The game ends during the script.
- After the script, it isn't your move.
- The start position can't judge the goal:
  - `winTrick` with no trick in progress.
  - `tricks` after the main tricks, with `min` over 7, already met, or out of reach.
  - `score` with `min` over 10, or already met.
  - `decide` with an answer that the rules refuse at the start position. This catches a typo in a card.

The start position always has these properties:

- The rules are this app's current rules version, with the house rules off, whatever the Settings say. A lesson must not change with a setting.
- The seats are named You, West and East.
- The state has no decision list, so a puzzle makes no replay code and can't enter `kct.replays`.

## Judge

```js
KCT.Puzzles.judge(goal, start, state, action)   // { verdict: 'open' } or { verdict: 'solved' | 'failed', reason }
```

The lesson calls the judge after every step from the start position: after your move, after each opponent's move and after each system step. `start` is the state that `load` returned, `state` is the current state, and `action` is the decision just applied, or `null` for a system step. The judge is a pure function. It changes nothing, and the same input always gives the same verdict.

The first verdict that isn't `open` stands, and the lesson stops there. For example, a `score` goal is solved the moment your score reaches `min`, even if a lost Showdown takes a point back later in the hand.

Every goal has a verdict by the end of the hand, so a lesson can't hang.

| Reason | Verdict | Meaning |
|---|---|---|
| `won` | solved | The goal is met. |
| `lostTrick` | failed | `winTrick`: another player won the trick. |
| `outOfReach` | failed | `tricks`: too few tricks are left to reach `min`. |
| `handOver` | failed | The hand ended before the goal was met. |
| `gameOver` | failed | Another player reached 10 points. |
| `otherChoice` | failed | `decide`: your decision isn't one of the answers. |

The lesson UI turns each reason into a line for the teacher. See [ui/teacher-bubbles.md](ui/teacher-bubbles.md).

## Tests

The self-test area **Puzzles** (`node tests/selftest.js`, or **Self-tests: Run** in Settings) checks:

- Every bundled lesson loads, starts on your move and places all 33 cards.
- The loader's stacked deal leaves the state exactly as the Engine's own `DEAL` step does. If `DEAL` changes, this check fails, and the loader must follow.
- Lesson 1 teaches one card: of your legal cards, only the Jack of Diamonds wins the trick.
- Eighteen broken puzzles are each refused with the expected reason, five of them for a goal that the start position can't judge.
- The judge on lesson 1: each legal card gets a verdict at once, and only the J♦ solves it.
- Discards match as a set: the same 3 cards in another order are the same decision.
- Random play-outs: each goal type, from two sets of scores, plays 12 random hands to the end. Each goal must get a verdict, and the verdict must agree with what happened in the hand (144 play-outs). A planted bug in the `score` goal fails this check.

## Lesson 1: The Left Bower

You deal. West calls Hearts on the turned 7♥, and East takes the 7♥. West leads the A♠, and East, with no spades, trumps with the Q♥. You have no spades either. Your hand: J♦, 9♥, A♦, 10♦, 8♦, K♣, Q♣.

The J♦ looks like a diamond, but with Hearts as trump it's the Left Bower, a trump above the Ace. It's the only card that wins. The 9♥ is trump too, but below the Q♥.

**Not a puzzle on the real table.** The game tags the J♦ **LEFT ♥**, rings it in gold and sorts it with the trumps, so the table shows the answer. This position becomes the first tour, which teaches you to read those signs. See [ui/teacher-bubbles.md](ui/teacher-bubbles.md), **What the table already teaches**.

## Not in this step

| Item | Plan |
|---|---|
| Defence, lesson mode, bubbles, format 2, the lessons | Planned, with build steps and checks, in [ui/teacher-bubbles.md](ui/teacher-bubbles.md). |
| From a replay | `fromReplay(code, step)`: a puzzle cut from a real game, with the deal read at the `DEAL` step and the script up to `step`. |

## Settled

- **A hint after a wrong answer:** yes. A failed puzzle offers **Hint**, which points at the right card.
- **When the goal is met:** the lesson ends at once, on the judge's first verdict.
