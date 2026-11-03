# Result panel standard

**Status: draft for review.** Nothing in this page is built yet. Items marked **Decision needed** wait for the owner's call.

This page is the standard for every panel that reports a hand or a game result: what it holds, in what order, and how its stats table is laid out. Each such panel follows this page. A change to one panel that this page does not allow starts with a change to this page.

## Why this page exists

The result tables are built in three places, each in its own way:

| Builder | Where it shows | Columns today |
|---|---|---|
| `Render.statsTableHTML` | Hand result, Showdown setup, Showdown result, and Game-over hand stats | 4 to 6, sized by content |
| `gameOverHandHTML` (second branch) | Game-over dialog, "Hand *n* so far" | 4, tricks written as "3 + 2 SD" |
| `showGameOver` final scores | Game-over dialog with no hand stats | 2, plain `table` |

Because each column takes the width of its widest content, the numbers sit at uneven distances, and a large score widens its own column. At phone width the six-column table scrolls sideways. This page replaces those three builders with one layout.

## Terms

| Term | Meaning |
|---|---|
| Result panel | The `.summary` box: on the table in place of the trick area, or inside the game-over dialog. |
| Stats table | The table in a result panel. One row for each player. |
| Name column | The first column: the player's name. |
| Number columns | Every other column. |
| Column pitch | The distance from the center of one number column to the center of the next. |

## 1. Panel anatomy

Every result panel has these parts, top to bottom. A part that a variant does not use is left out; the others keep their order.

| # | Part | Content | Example |
|---|---|---|---|
| 1 | Title | What the panel reports. | "Hand 10: Showdown result" |
| 2 | Outcome line | One sentence: who won what. | "Doc wins the Showdown 3–2." |
| 3 | Call line | Trump, who named it, the dealer. | "Trump ♦ Diamonds · named by Ace (round 2) · Dealer You" |
| 4 | Stats table | Section 2. | |
| 5 | Body text | Only the Showdown setup: what happens next. | |
| 6 | Footnote | Abbreviations and score rules used in the table. | "SD = Showdown. Score cannot fall below 0." |

**Rule 1.1.** The panel has the same inner padding on the table and in the game-over dialog. The dialog does not add its own padding rules for the panel.

**Rule 1.2.** Every panel that uses an abbreviation in the table explains it in the footnote. Today only the Showdown result does; the game-over dialog's "Hand *n* stats" shows "SD" with no footnote.

## 2. Stats table

### 2.1 Columns

Columns always appear in this order. A variant leaves out the columns it does not use; it never reorders them.

| Order | Heading | Shown in | Value |
|---|---|---|---|
| 1 | Player | All | Name in the seat color, then 🏆 for the game winner. |
| 2 | Tricks | All | Tricks won in the hand, 0 to 7. |
| 3 | SD tricks | Showdown result, game ended in a Showdown | Showdown tricks won; — for the mediator. |
| 4 | Hand pts *or* SD pts | Hand result, Showdown result | Points from the hand outcome, signed. |
| 5 | King pts | All | Points from Kings, signed. |
| 6 | Score | All | The running score. ⭐ for a score over 10. |

**Rule 2.1.** One builder makes every stats table, including "so far" and final scores. A table with fewer columns is the same table with columns left out, so the "3 + 2 SD" form goes away.

### 2.2 Column spacing

**Rule 2.2.** All number columns in a table have the same column pitch. The distance between two numbers does not depend on their size, their sign or the column heading.

**Rule 2.3.** Every number column is as wide as the widest number column needs, measured over the heading and every value. The table's extra width, if any, is shared equally between the number columns.

**Rule 2.4.** The name column is as wide as the longest name plus the trophy. It does not take a share of the extra width.

**Rule 2.5.** The score's larger type does not widen the score column beyond the others.

> **Decision needed: how equal columns are built.** Three ways meet Rules 2.2 to 2.5. Each one keeps every cell's content whole; none clips or truncates text.
>
> | Option | How | Trade-off |
> |---|---|---|
> | A. CSS grid (recommended) | The table becomes a grid: `grid-template-columns: max-content repeat(n, minmax(max-content, 1fr))`, with each row as `display: contents`. | Equal tracks with no fixed widths, and content sets the minimum. Needs ARIA table roles to stay a table for screen readers. |
> | B. `<colgroup>` with equal widths | A real `<table>`; the builder sets each number `<col>` to the same width in `ch`, worked out from the widest heading. | Keeps native table semantics. The width is a computed value that must be kept right when a heading changes. |
> | C. Leave the table auto, center the values | Today's layout, with centered values only. | Smallest change. Does **not** meet Rule 2.2: the pitch still follows content. |

### 2.3 Alignment

| Content | Horizontal | Vertical |
|---|---|---|
| Name column: heading and names | Left | Middle |
| Number columns: headings | Center | Bottom (headings of one and two lines share a baseline) |
| Number columns: values | Center, on the column's center line | Middle |
| Signed points (+1, −1) | Center, with the sign included in the centered text | Middle |

**Rule 2.6.** Numbers use tabular figures (`font-variant-numeric: tabular-nums`), so 6 and 10 share one center line and digits do not shift between rows.

### 2.4 Headings

**Rule 2.7.** A heading is at most two lines. A two-word heading breaks between its words ("SD / TRICKS", "KING / PTS"); a one-word heading stays on one line.

**Rule 2.8.** Headings use small capitals in the muted text color, at one size, with no extra letter spacing.

### 2.5 Values

| Value | Shown as | Color |
|---|---|---|
| Gain | +1 | `--good`, bold |
| Loss | −1 (true minus sign) | `--danger`, bold |
| Zero | — | Muted |
| Not applicable (not in the Showdown) | — | Muted |
| Score over 10 | ⭐ | Ink |

> **Decision needed: zero and not applicable.** Both show "—" today, so "scored nothing" and "did not take part" look the same. Options: keep "—" for both, or show "0" for zero and "—" for not applicable.

### 2.6 Type scale

One scale for every stats table, in `rem`, so it follows the page's root size.

| Role | Wide (≥ 26rem viewport) | Narrow (< 26rem) | Weight |
|---|---|---|---|
| Headings | 0.6875rem | 0.625rem | 700 |
| Names | 1.0625rem | 0.9375rem | 800 |
| Values (tricks, points) | 0.8125rem | 0.75rem | 400; points 800 |
| Score | 1.625rem | 1.375rem | 800 |

## 3. Width

**Rule 3.1.** The smallest supported viewport is 360 px wide. At that width, a six-column stats table fits inside the game-over dialog, award stroke included, with no sideways scroll.

**Rule 3.2.** The `.stats-wrap` scroll container stays only as a guard for widths below 360 px. At 360 px and above it never scrolls.

**Rule 3.3.** On a wide screen the table does not stretch past a set maximum (proposed: 28rem) and is centered in the panel, so the column pitch stays readable.

## 4. Acceptance checks

A result panel meets this standard when an automated check, run at 360 px and 410 px with the six-column Showdown table in the game-over dialog, finds all of these:

1. The `.stats-wrap` scroll width equals its client width.
2. The centers of all number values in one row are spaced equally, within 1 px.
3. Each number value's center lies on its heading's center, within 1 px.
4. No cell's content is clipped (`scrollWidth` ≤ `clientWidth` for every cell).
5. All three builders in "Why this page exists" are gone, and every result table comes from the one builder.

The check belongs in `tests/scenarios.js`, beside the existing game-over checks.

## 5. Open decisions

| # | Question | Section |
|---|---|---|
| 1 | Which way to build equal columns: A, B or C. | 2.2 |
| 2 | Zero and not applicable: one mark or two. | 2.5 |
| 3 | Smallest supported width: 360 px, or narrower (320 px). | 3 |
| 4 | Maximum table width on a wide screen. | 3 |

## Related pages

- [Vocabulary](vocabulary.md): the names of the hand summary, the stats table and the game-over dialog parts.
- [Colors](colors.md): the `--good`, `--danger` and muted text tokens used in section 2.5.
