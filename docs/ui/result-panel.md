# Result panel standard

**Status: draft for review.** Nothing in this page is built yet. Items marked **Decision needed** wait for the owner's call.

This page is the standard for every panel that reports a hand or a game result: what it holds, what it leaves to the table behind it, and how its stats table is laid out. Each such panel follows this page. A change to one panel that this page does not allow starts with a change to this page.

## Principles

These four principles decide every rule below, and any case the rules do not cover.

| # | Principle | What it means for a result panel |
|---|---|---|
| P1 | **One place for each fact.** | A fact that the screen already shows behind or around the panel is not shown again in the panel. The panel either covers that fact completely or leaves it out. A player never sees one fact in two places. |
| P2 | **Simpler is better.** | Fewer parts, fewer columns, fewer words. When a part can go, it goes. |
| P3 | **Size adaptive.** | The layout follows the space it has. It never relies on one tuned width, and it never scrolls sideways. |
| P4 | **White space is welcome; alignment is important.** | Room comes from showing less, not from squeezing padding. Everything in the panel sits on shared lines: shared left edges, shared column centers, shared baselines. |

## Terms

| Term | Meaning |
|---|---|
| Result panel | The `.summary` box: on the table in place of the trick area, or inside the game-over dialog. |
| Stats table | The table in a result panel. One row for each player. |
| Context | Everything the player can see while the panel is open, outside the panel. |
| Name column | The first column of the stats table: the player's name. |
| Number columns | Every other column of the stats table. |
| Column pitch | The distance from the center of one number column to the center of the next. |

## 1. Context: what is already on screen

### 1.1 Behind the on-table result panel

The on-table panel (Hand result, Showdown setup, Showdown result) sits in the trick area. Everything around it stays in view:

| Fact | Where the context shows it |
|---|---|
| Each player's score | Seat head score (`.sscore`), already updated for the hand. |
| Tricks won this hand | Seat trick circles (`.tpips`): 7 for the hand; for a Showdown player, 5 for the Showdown. |
| Trump | Trump chip in the top bar. |
| Hand number | Hand chip in the top bar. |
| Dealer, namer, kitty, mediator, Showdown players | Seat tags (`.tag.dealer`, `.tag.caller`, `.tag.receiver`, `.tag.mediator`, `.tag.duelist`). |
| Player names and seat colors | Seat heads. |

### 1.2 Behind the game-over dialog

The game-over dialog opens over the same table. Today its backdrop is see-through (`rgba(0,0,0,.6)`), so the player sees all of section 1.1 behind it, and also:

| Fact | Where the context shows it |
|---|---|
| The winner and the winning score | Status strip: "Doc wins with 10 points." |
| That the game is over | Hand chip: "Game over". |

### 1.3 What the panels repeat today

| Fact | On-table panel today | Game-over dialog today |
|---|---|---|
| Score | Score column | Score column, and headline |
| Tricks won | Tricks column (and SD tricks) | Tricks and SD tricks columns |
| Trump | Call line | Call line |
| Hand number | Title | Title and end reason |
| Dealer and namer | Call line | Call line |
| Winner | — | Headline, trophy, and status strip behind |

Every row of this table breaks P1.

## 2. The P1 rule for each panel

**Rule 2.1.** The on-table panel **leaves out** every fact in section 1.1. The seats, chips and tags around it stay the single place for those facts. The panel shows only what the context does not: what happened in the hand and what it was worth.

**Rule 2.2.** The game-over dialog **covers** the context completely. Its backdrop is opaque, so the dialog is the only thing in view and is the single place for its facts. The player closes it (**‹ Back**) to see the table again.

> **Decision needed: cover or leave out, for the game-over dialog.** Rule 2.2 is the recommendation. The other way is to keep the see-through backdrop and leave out of the dialog every fact the table shows.
>
> | Option | Dialog holds | Trade-off |
> |---|---|---|
> | Cover (recommended) | Winner, how the game ended, final scores, and the last hand's points. | One complete end screen, the same in a live game and in the replay viewer. The table is hidden until **‹ Back**. |
> | Leave out | Winner headline, how the game ended, and the buttons only. | The smallest dialog. The scores and tricks are read off the seats behind it, which the dialog partly hides at phone height. |

## 3. Panel anatomy

### 3.1 On-table result panel

| # | Part | Content | Example |
|---|---|---|---|
| 1 | Title | The kind of result, with no hand number (the hand chip has it). | "Hand result", "Showdown!", "Showdown result" |
| 2 | Outcome line | One sentence: who won what. | "Doc wins the Showdown 3–2." |
| 3 | Points table | Section 4: only the points the hand gave. | |
| 4 | Body text | Showdown setup only: what happens next. | |
| 5 | Footnote | Only when the table uses an abbreviation or a score rule needs saying. | "Score cannot fall below 0." |

The call line (trump, namer, dealer) is left out: the trump chip and the seat tags show all three.

### 3.2 Game-over dialog (if covered)

| # | Part | Content |
|---|---|---|
| 1 | Headline | "You win!" or "*Name* wins!" |
| 2 | End reason | "The game ended in hand 10 by winning the Showdown." |
| 3 | Final table | Section 4: final score, and the last hand's points. |
| 4 | Wave note | As today. |
| 5 | End buttons | As today. |

The trophy is left out: the headline already names the winner. The call line is left out: trump and dealer of the last hand do not explain the result.

## 4. Stats table

### 4.1 Columns

Columns appear in this order. A table leaves out the columns it does not use; it never reorders them.

| Order | Heading | On-table panel | Game-over dialog (covered) | Value |
|---|---|---|---|---|
| 1 | *(none)* | ✓ | ✓ | Name in the seat color. |
| 2 | Hand *or* Showdown | ✓ | ✓ | Points from the hand's outcome, signed. |
| 3 | Kings | ✓ | ✓ | Points from Kings, signed. |
| 4 | Score | — | ✓ | Final score. ⭐ for a score over 10. |

**Rule 4.1.** The name column has no heading. The names are their own label.

**Rule 4.2.** Headings are one word. "Hand", "Showdown", "Kings", "Score" replace "Hand pts", "SD pts", "King pts". Points are the only thing a number column holds, so "pts" adds nothing; "Showdown" is written out, so the table needs no "SD" footnote.

**Rule 4.3.** Trick counts are not columns. The trick circles show them on the table; the outcome line states the split that decided the hand ("tied 3–3", "wins the Showdown 3–2").

**Rule 4.4.** One builder makes every stats table. The three builders today (`Render.statsTableHTML`, the "so far" branch of `gameOverHandHTML`, and the final-scores table in `showGameOver`) become one.

### 4.2 Alignment

**Rule 4.5.** All number columns in a table have the same width, so the column pitch is equal. The distance between two numbers does not depend on their size, their sign or their heading.

**Rule 4.6.** Each number column is as wide as the widest number column needs. Spare width is shared equally between the number columns, never given to the name column.

**Rule 4.7.** Every number and its heading are centered on the column's center line. Numbers use tabular figures, so digits do not shift between rows.

**Rule 4.8.** Names, the title, the outcome line and the body text share one left edge in the on-table panel.

> **Decision needed: centered or left-aligned text in the panel.** Rule 4.8 left-aligns the text so it lines up with the names. Today the title and lines are centered. Left-aligned text gives one edge for the eye; centered text matches the dialog headline.

| Content | Horizontal | Vertical |
|---|---|---|
| Names | Left | Middle |
| Number headings | Center | Bottom |
| Numbers and signed points | Center | Middle |

### 4.3 Values

| Value | Shown as | Color |
|---|---|---|
| Gain | +1 | `--good`, bold |
| Loss | −1 (true minus sign) | `--danger`, bold |
| No points | — | Muted |
| Score over 10 | ⭐ | Ink |

With trick columns gone, "—" means only "no points", so the old clash between "zero" and "did not take part" no longer arises.

## 5. Size and space

**Rule 5.1.** Type, padding and column width scale with the space the panel has (CSS `clamp()` against the container width), not with fixed breakpoints.

**Rule 5.2.** Padding has a floor that is never cut to make content fit. When content does not fit, the table shows less (section 4), never less space.

**Rule 5.3.** The panel fits every viewport from 320 px wide up, with no sideways scroll. The `.stats-wrap` scroll container is removed.

**Rule 5.4.** On a wide screen the table stops growing at a width where its numbers still read as one row, and stays centered in the panel.

| Role | Small | Large | Weight |
|---|---|---|---|
| Headings | 0.6875rem | 0.75rem | 700, muted, small capitals |
| Names | 1rem | 1.125rem | 800, seat color |
| Points | 1rem | 1.125rem | 800 |
| Score (dialog) | 1.5rem | 1.875rem | 800 |

## 6. Acceptance checks

An automated check in `tests/scenarios.js` opens each panel at 320 px, 360 px, 410 px and a desktop width, and finds all of these:

1. No fact from section 1 appears both in the panel and in its visible context.
2. The panel's scroll width equals its client width.
3. The centers of all number values in one row are spaced equally, within 1 px.
4. Each number's center lies on its heading's center, within 1 px.
5. No cell's content is clipped.
6. Padding is never below its floor.
7. Every stats table comes from the one builder.

## 7. What changes from today

| Today | Under this standard |
|---|---|
| Six columns, sideways scroll at phone width | Two or three number columns that fit at 320 px |
| Hand number, trump, dealer, namer, score and tricks repeated from the table | Left out (on-table panel) or covered (dialog) |
| "SD" abbreviation and footnote | Headings written out; no footnote |
| Columns sized by content, uneven pitch | Equal columns, equal pitch |
| Padding cut at phone width (PR #279) | Padding floor; content reduced instead |

## 8. Open decisions

| # | Question | Section | Recommendation |
|---|---|---|---|
| 1 | Game-over dialog: cover the table, or leave out what the table shows. | 2 | Cover |
| 2 | Panel text: left-aligned with the names, or centered. | 4.2 | Left-aligned |

## Related pages

- [Vocabulary](vocabulary.md): the names of the hand summary, seat parts, top bar chips and game-over dialog parts.
- [Colors](colors.md): the `--good`, `--danger` and muted text tokens used in section 4.3.
