# Puzzles: format, loader, judge and search

The engine behind Training and Puzzles: short, fixed positions that each teach one idea. This page covers the data format, the loader, the judge, the search that plays the defence, and the tools that build and find puzzles. What the player sees (the lobby, the bubbles, the lessons) is in [ui/teacher-bubbles.md](ui/teacher-bubbles.md).

Status: format 2, in `index.html` (the `Puzzles` module, after `Replay`; the lists `TRAINING` and `PUZZLES` after it). Started 2026-10-15, revised 2026-10-19.

## Goals

- Teach the rules by play, one idea per lesson.
- Add no rules and no settings. A puzzle runs on the same Engine as a real game.
- Make a broken puzzle fail a test, not a player.

## Design in one paragraph

A puzzle is a **deal** and a **script**. The deal sets the 10 cards in each hand and the 3 kitty cards. The script lists player decisions in the same form as a replay code's decision list. The loader puts the deal on the table, then plays the script through `Engine.dispatch`, which checks every step. The script stops when it is your move: that is the puzzle's start position. The loader never writes game state by hand, except the deal. Played cards, voids, tricks won, King points and the trick in progress all come from real moves. A puzzle can start at any point of a hand: the discard, the bidding, the exchange or any trick.

## Format

A puzzle is one object. Every field is required, except `seed`, `say` and `tips`. A field the format does not name is an error, so a typo can't pass silently. Format 1 (the first eleven fields) still loads; the game's own lessons are all format 2.

| Field | Type | Meaning |
|---|---|---|
| `format` | `2` (or `1`) | The format version. |
| `id` | string | Lowercase words joined by hyphens, for example `left-bower`. `kct.lessons` keeps the lessons done by `id`. |
| `title` | string | The lesson name. |
| `prompt` | string | The task. The teacher says it last, before you play. For example, "Win the trick." |
| `lesson` | string | The rule. The teacher says it when the lesson is solved. |
| `goal` | object | What counts as solved. See **Goals**. |
| `seed` | integer | Optional, default 1. Seeds the game's RNG. It matters only when the script reaches a Showdown, which shuffles the outside pile. |
| `dealer` | 0, 1 or 2 | The dealer. Seat 0 is you, 1 is West, 2 is East. Play goes 0, 1, 2, so the dealer's left is the next seat. |
| `scores` | 3 integers | The scores before the hand, each 0 to 9. |
| `deal.hands` | 3 lists of 10 cards | The cards dealt to seats 0, 1 and 2, before the discard. |
| `deal.kitty` | 3 cards | The kitty. The first card is the one turned up. |
| `script` | list of decisions | The player decisions from the deal to the start position. |
| `kind` | `lesson` or `puzzle` | Format 2. A Training lesson or a puzzle. |
| `teachers` | `{ west, east }` | Format 2. Two different bot ids. West teaches; East is the learner. A lesson always seats them, also with **Personalities** off. |
| `say` | object | Format 2, optional. The lines: `intro`, `hint`, `solved`, `failed`. Each is a list of `[seat, text]`, where `seat` is `west` or `east`. `{JD}` in the text is a card: the bubble shows it as a mini card. |
| `tips` | `guided` | Format 2, optional, with the goal `playHand` only. The coach speaks on your move at each new step (see [ui/teacher-bubbles.md](ui/teacher-bubbles.md)). |

Cards use the game's ids: rank then suit, for example `AS`, `10H`, `JD`. The Joker is `JK`. The deal must hold all 33 cards once each.

### Script decisions

Each decision has the same fields as a decision in a replay code:

| Decision | Fields | Example |
|---|---|---|
| Discard 3 | `player`, `cards` | `{ type: 'DISCARD', player: 1, cards: ['8S', '7S', '10C'] }` |
| Round 1 bid | `player`, `accept` | `{ type: 'BID', player: 1, accept: true }` |
| Round 2 bid | `player`, `suit` (or `null` to pass) | `{ type: 'NAME', player: 2, suit: 'S' }` |
| Exchange discard | `player`, `cards` | `{ type: 'EXCHANGE', player: 2, cards: ['9D'] }` |
| Play a card | `player`, `card` | `{ type: 'PLAY', player: 1, card: 'AS' }` |
| Showdown discard | `player`, `card` | `{ type: 'SHOWDOWN_DISCARD', player: 1, card: '7S' }` |

System steps (the turn-up, the end of a trick, the next hand) run on their own between decisions, as in a replay.

### Goals

The loader checks each goal twice: its fields, and then whether the start position can judge it (see **Loader**). The judge decides when a goal is met (see **Judge**).

| `type` | Extra field | Solved when | Judged |
|---|---|---|---|
| `winTrick` | none | You win the trick in progress. | At the end of that trick. |
| `kingPoint` | none | A King of yours wins the trick in progress (+1). | At the end of that trick. |
| `tricks` | `min` | You have taken at least `min` main tricks this hand. Tricks taken before the start count. Showdown tricks don't. | As soon as it is certain. |
| `score` | `min` | Your score reaches `min` before the hand ends. `min` is a score, not a gain. A Showdown is part of the hand. | At each score change, and at the end of the hand. |
| `winGame` | none | You reach 10 points. | When the game ends, or at the end of the hand. |
| `decide` | `accept` | Your next decision is one of the decisions in `accept`. Discards match as a set, in any order. | At your next decision. |
| `playHand` | none | The hand is over. It can't fail: it's the guided hand. | At the end of the hand. |

## Loader

```js
KCT.Puzzles.load(puzzle)       // { ok: true, state, puzzle } or { ok: false, error }
KCT.Puzzles.shapeError(puzzle) // the first problem in the fields, or null. Does not run the script.
KCT.TRAINING                   // the seven Training lessons, in order
KCT.PUZZLES                    // the ten puzzles, in order
```

`load` never throws. It refuses a puzzle with a reason when:

- A field is missing, unknown or of the wrong type, a card is unknown or dealt twice, a teacher is not a bot, or a line is not `[seat, text]` or names an unknown card.
- A script step is illegal. The error names the step, for example `script step 6 (PLAY): illegal card`.
- The game ends during the script.
- After the script, it isn't your move.
- The start position can't judge the goal:
  - `winTrick` with no trick in progress, or `kingPoint` with no trick or no King in your hand.
  - `tricks` after the main tricks, with `min` over 7, already met, or out of reach.
  - `score` with `min` over 10, or already met.
  - `decide` with an answer that the rules refuse at the start position. This catches a typo in a card.
  - `playHand` with the hand already over.

The start position always has these properties:

- The rules are this app's current rules version, with the house rules off, whatever the Settings say. A lesson must not change with a setting.
- The seats are named You, West and East (a lesson then seats the teachers).
- The state has no decision list, so a puzzle makes no replay code and can't enter `kct.replays`.

## Judge

```js
KCT.Puzzles.judge(goal, start, state, action)   // { verdict: 'open' } or { verdict: 'solved' | 'failed', reason }
```

The lesson calls the judge after every step from the start position: after your move, after each opponent's move and after each system step. `start` is the state that `load` returned, `state` is the current state, and `action` is the decision just applied. The judge is a pure function: it changes nothing, and the same input always gives the same verdict.

The first verdict that isn't `open` stands, and the lesson stops there. Every goal has a verdict by the end of the hand, so a lesson can't hang.

| Reason | Verdict | Meaning |
|---|---|---|
| `won` | solved | The goal is met. |
| `lostLine` | failed | After your move, the best defence can now stop you (the lesson checks this with the search, so a lost position ends at once). |
| `lostTrick` | failed | `winTrick` or `kingPoint`: the trick ended without it. |
| `outOfReach` | failed | `tricks`: too few tricks are left to reach `min`. |
| `handOver` | failed | The hand ended before the goal was met. |
| `gameOver` | failed | Another player reached 10 points. |
| `otherChoice` | failed | `decide`: your decision isn't one of the answers. |

A lesson's `say.failed` lines speak for any reason; without them, the teacher says a line for the reason.

## Search

The hands are open to the search: it sees every card. It plays trick play and the Showdown, never the bidding. The opponents work together against your goal. A search that would visit more than 250,000 positions stops and returns `null`. Puzzles start with four tricks left or fewer, which keeps each search small: at most 4! × 4! × 4! = 13,824 orders of play.

```js
KCT.Puzzles.answers(goal, start, state)    // each of your moves now: [{ action, wins }], or null
KCT.Puzzles.defend(goal, start, state)     // an opponent's move that stops you, or null when none does
KCT.Puzzles.forcible(goal, start, state)   // can you still force the goal from here? true, false or null
```

- **Defence.** In a puzzle, each opponent plays `defend`'s move, or the bot's own move when nothing stops you. In the guided hand, the bots play as themselves.
- **Hint.** **Hint** starts the lesson again, and the first move that `answers` marks as a win glows in your hand.
- **Early failure.** After your move, when `forcible` is `false`, the lesson fails at once with `lostLine`, instead of tricks later.

## Build and find puzzles

| Tool | What it does |
|---|---|
| `tests/puzzlekit.js` | Builds puzzles from readable specs. A spec gives the hands after the exchange (`hands7`), the caller, the turned card and the plays. The kit fills in the deal, the discards, the bidding and the exchange; or a spec gives the dealt hands, kitty and script whole. It loads each one in the game and prints what the search says about each of your moves. `--write TRAINING` or `--write PUZZLES` writes the list into `index.html`. |
| `tests/data/training-specs.js` | The source of the seven Training lessons. |
| `tests/data/puzzle-specs.js` | The source of the ten puzzles. Each one names the seed of the bot game it was found in. |
| `tests/minepuzzles.js` | Plays bot games. At each of your moves in the last four tricks, it asks the search what you can force. It keeps a position when you can force the goal, few of your moves do, and the move a quick player makes (the fast AI) does not. It prints the candidates as specs. |

```sh
cd tests
node minepuzzles.js 1500 8 > candidates.json            # about 4 minutes
node puzzlekit.js data/puzzle-specs.js                   # check each puzzle's answers
node puzzlekit.js data/puzzle-specs.js --write PUZZLES   # write them into index.html
```

## Tests

The self-test area **Puzzles** (`node tests/selftest.js`, or **Self-tests: Run** in Settings) checks:

- Every Training lesson and every puzzle loads, starts on your move and places all 33 cards.
- Every trick lesson and puzzle teaches: against the best defence, at least one move wins and at least one fails. A `decide` lesson leaves a wrong choice open. Only the guided hand has no search.
- Training has seven lessons and ends with the guided hand.
- The loader's stacked deal leaves the state exactly as the Engine's own `DEAL` step does. If `DEAL` changes, this check fails, and the loader must follow.
- The bowers lesson teaches one card: of your legal cards, only the J♦ wins the trick.
- Eighteen broken puzzles are each refused with the expected reason.
- `defend` returns a legal move for the seat to act.
- Random play-outs: each goal type, from two sets of scores, plays 12 random hands to the end. Each goal must get a verdict, and the verdict must agree with what happened in the hand (144 play-outs).

`node tests/training.js` plays Training and all ten puzzles through the real controls (see [tests/README.md](../tests/README.md)).

## Not done

- **From a replay:** `fromReplay(code, step)`, a puzzle cut from your own finished game.
- **A Showdown puzzle:** the Showdown deal comes from the RNG, so a puzzle can choose only the `seed`. A `showdownDeal` field would let it set the cards.
