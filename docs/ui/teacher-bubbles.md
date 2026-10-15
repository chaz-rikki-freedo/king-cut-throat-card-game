# Teacher bubbles

A plan, not a spec. In a lesson, the two opponents are the teachers. They speak in speech bubbles that come from their seats, in their own voices. This page plans the bubble, the lesson flow and the data that drives them. Nothing here is built yet. The puzzles, the loader and the judge are in [../puzzles.md](../puzzles.md).

A static mockup is in [mockups/teacher-bubbles/index.html](../../mockups/teacher-bubbles/index.html). It shows lesson 1 at desktop and phone widths.

## Why bubbles

- **A person teaches better than a panel.** The bots already have names, faces, colors and voices (see [../banter.md](../banter.md) and [../characters.md](../characters.md)). A lesson that comes from Mei or Kit feels like a table, not a manual.
- **The bubble points at its source.** A tail from the West seat says "West is talking" without a label.
- **Two teachers can hold a dialog.** One asks the question that a new player would ask. The other answers it. The player hears the mistake made out loud before they make it.

## The pair: a teacher and a learner

Each lesson seats two personalities:

- **The teacher** explains the rule. The Sharks and the Club players fit: Mei counts, Doc reads bids, Viv waits, Ace pushes.
- **The learner** asks the question or makes the classic mistake. The Novices fit: Kit is new to the table, Lou worries, Tex calls anything.

| Lesson | Mechanic | Teacher | Learner | Why this pair |
|---|---|---|---|---|
| 1 | The Left Bower | Mei | Kit | Kit's own line is "Which one's trump?" Mei counts every trump. |
| 2 | Following suit with the Left Bower | Mei | Kit | The same pair, the next step. |
| 3 | King points | Ace | Lou | Ace likes the bold King play. Lou expects it to go wrong. |
| 4 | The win at 10 | Vex | Tex | Vex ends games. Tex never sees it coming. |
| 5 | Drawing trump | Doc | Gus | Doc keeps what it calls. Gus throws trumps away. |
| 6 | Call or pass | Doc | Tex | "I only call what I keep" against "Pass? Never heard of it." |
| 7 | The discard | Viv | Lou | Viv waits for the right hand and builds it. |
| 8 | The Showdown | Zen | Kit | Zen: "A loss is a lesson." |

The seats stay West and East, as in a real game, so the bubble tails stay true.

## The bubble

### Anatomy

```
 ┌─ West seat ─────┐
 │ [Mei]  Mei   2  │
 └──────┬──────────┘
        ▼ tail, in Mei's color
 ┌────────────────────────────────────┐
 │ MEI                                │  name, in the persona color
 │ Hearts are trump. Count the J♦     │  1 or 2 short sentences
 │ as a heart: it's the Left Bower.   │  card chips inline
 │                          [ Next ]  │  only on a stop bubble
 └────────────────────────────────────┘
```

- **Body:** the card color of the table (light), dark ink, a border and a tail in the speaker's persona color. Every persona color is light, so the name line uses dark ink on a persona-color strip. Don't use the persona color as text on the light body.
- **Text:** at most 2 sentences, about 120 characters. Longer text becomes a second bubble.
- **Card chips:** a card named in the text renders as a small card, like the mini cards of the last trick (`.lasttrick .card`). Screen readers get the full name ("Jack of Diamonds") from `Rules.describeCard`.
- **Pointer:** a bubble can point at a card in your hand or on the table. That card gets a gold ring (the trump ring style, `.card.trump`) while the bubble shows.

### Two kinds

| Kind | When | Behavior |
|---|---|---|
| **Stop** | The intro, the verdict, a hint. | Play waits. A **Next** button, or the lesson buttons at the end. Space or Enter presses it, as elsewhere in the game. |
| **Aside** | A remark during play, such as the learner's reaction to a card. | Play goes on. It fades after about 3 seconds, like a toast. A click dismisses it. |

At most one bubble shows at a time. Bubbles queue.

### Position

- **Wide screens:** the bubble hangs below the speaker's seat panel, over the edge of the center. The tail points up at the seat face. It never covers your hand or the trick in progress.
- **Phones** (720 px and narrower, where West and East share the top row): the bubble spans the width of the table under the top row. The tail moves under the speaker's seat.
- **Advanced UI:** the same bubble. It hangs from the seat panels, which the Advanced table also has, so one component serves both tables.

### Motion and access

- It grows from the tail point in about 150 ms. With `prefers-reduced-motion`, it appears without motion.
- A stop bubble is a non-modal dialog (`role="dialog"`, labeled by the speaker's name). Focus moves to its button and goes back to the table after.
- An aside goes to a polite live region, so a screen reader reads it without interrupting.
- Each line also goes into the Latest Scroll as `Mei: "…"`, the way read lines do in Dynamic mode, so a missed bubble can be read again.

## Lesson flow

```
Intro (stop bubbles)  →  You play  →  The judge decides
                                         ├─ solved → the teacher says the lesson   → [Next lesson] [Lessons]
                                         └─ failed → the learner, then the teacher → [Try again] [Hint]
```

1. **Intro:** 2 or 3 stop bubbles. The learner asks, the teacher answers, and the last bubble gives the task (the puzzle's `prompt`).
2. **Play:** the teachers are quiet. A rule hint from the game itself (the action bar) stays as usual.
3. **Verdict:** the judge's first verdict that isn't open ends the lesson.
   - **Solved:** the teacher says the lesson (the puzzle's `lesson`). The lesson is marked solved.
   - **Failed:** a line for the judge's reason (`lostTrick`, `outOfReach`, `handOver`, `gameOver`, `otherChoice`). The learner comforts, then the teacher says why. **Try again** reloads the start position. **Hint** shows the hint bubble, which points at the right card.

## Data

The lines belong with the puzzle, so a lesson is one entry. This adds two fields, which makes it **format 2** (format 1 refuses unknown fields on purpose).

```json
{
  "format": 2,
  "id": "left-bower",
  "teachers": { "west": "mei", "east": "kit" },
  "talk": {
    "intro": [
      ["east", "Spades led, and I have none. Which one's trump again?"],
      ["west", "Hearts. And count the {JD} as a heart too."]
    ],
    "hint": [["west", "{JD}. Look again: it's the Left Bower."]],
    "solved": [["east", "Wait, the Jack of Diamonds won?"], ["west", "Third-highest trump. I counted."]],
    "failed": {
      "lostTrick": [["east", "Oh. East's Queen took it."], ["west", "Your {JD} beats the {QH}. Try again."]]
    }
  }
}
```

- A line is `[seat, text]`. The seat is `west` or `east`, never a name, so a line always matches its tail.
- `{JD}` is a card chip. The loader checks that each one is a real card id.
- A failed reason with no lines gets a general line from the teacher.
- The `teachers` seat the personas. A lesson always uses them, also when **Personalities** is off, as a wave does.

## Build steps

1. **Bubble component:** one element under the table, a queue, the two kinds, the position rules and the card chips. No game logic.
2. **Lesson runner:** loads a puzzle, seats the teachers, plays the intro, runs the judge after every step, and shows the verdict. The opponents' defence is part of this step (see [../puzzles.md](../puzzles.md)).
3. **Format 2:** `teachers` and `talk`, with the loader checks and self-tests.
4. **Lessons 1 to 8**, with their lines.
5. **Tutorial button:** the lessons list and the solved marks.

## Open questions

1. Should the bubbles also carry the banter lines in normal games? Today those go only to the Latest Scroll. That would bring the bots to life outside lessons, but it's a separate change.
2. Should an aside wait for you to dismiss it, for slow readers? Or should it get a longer time at the Guided UI level?
3. Do the pairs above fit the voices you want? Changing a pair changes only the data.
