# UI levels

Status: **draft**. The levels are planned and are not built yet. The names and the matrix are a starting point for the design.

A *UI level* is one version of the interface. All four levels play the same game with the same rules and the same areas. They differ only in how much text they show.

## The four levels

| Level | Name | ID | Who it is for | What it shows |
|---|---|---|---|---|
| 1 | Guided | `guided` | A new player. | Descriptors and instructions: what each thing is, and what to do now. |
| 2 | Full instructions | `full` | A player who knows the table but not every rule. | All instructions: what to do now, and the effect of each choice. |
| 3 | Minimum instructions | `minimal` | A player who knows the rules. | Short instructions only: what to do now, in a few words. |
| 4 | Advanced | `advanced` | A seasoned player. | No instructions. A minimal table, like play at a real table. |

Use the ID in code and in saved settings. Use the name in the interface.

## Text kinds

Each part in the [vocabulary](vocabulary.md) has a text kind. A level shows or hides a part by its kind.

| Kind | Meaning | Example |
|---|---|---|
| Control (C) | A part that you can use. | A suit button, a card in your hand. |
| Label (L) | The short name of a thing. | "Kitty (3)", the Dealer tag. |
| Descriptor (D) | What a thing is, or what it means. | A setting tooltip, a menu subtitle, a personality's play hint. |
| Instruction (I) | What to do now, and its effect. | The prompt and the hint in the action bar. |
| Status (S) | What is happening now. | The status line, a bid bubble, a toast. |
| Record (R) | What happened before. | The log, the last-trick strip, the stats table. |

## Draft matrix

| Kind | Guided | Full instructions | Minimum instructions | Advanced |
|---|---|---|---|---|
| Control | All. | All. | All. | All, compact. |
| Label | All, in words. | All, in words. | All, in words. | Short: symbols and numbers where they are clear. |
| Descriptor | All: tooltips, setting hints, menu subtitles, profile texts, Rules. | Tooltips and the Rules dialog only. | The Rules dialog only. | The Rules dialog only. |
| Instruction | Prompt and hint. | Prompt and hint. | Prompt only, in short form. | None. The hand and the buttons show what you can do. |
| Status | Status line, bubbles, discard notes, all toasts. | As Guided. | Status line, bubbles, discard notes. Toasts for points only. | Bubbles, turn highlight and points only. |
| Record | Log, last-trick strip, stats tables. | As Guided. | As Guided. | As Guided. The log can be closed. |

### Example: Round 1 bid

| Part | Guided | Full instructions | Minimum instructions | Advanced |
|---|---|---|---|---|
| Prompt | "Accept ♠ Spades as trump?" | "Accept ♠ Spades as trump?" | "Accept ♠?" | — |
| Hint | The effect, and what *trump* and *kitty* mean. | "If you accept, the 9♠ goes to West (your left), who then discards 1. The other 2 kitty cards go to the outside pile." | — | — |
| Buttons | **Accept ♠**, **Pass** | **Accept ♠**, **Pass** | **Accept ♠**, **Pass** | **♠**, **Pass** |
| Status line | "Round 1 · Your call on Spades." | As Guided. | "Round 1 · Your call." | — |

## What every level keeps

These parts protect the player or the data. Every level shows them, in full words.

- The rules that the game enforces: unplayable cards are disabled, a blocked suit is disabled, a confirm button waits for enough cards.
- The confirm dialogs: the replace-game confirm and the seat hand-over confirm.
- The save-failure toast: "This browser is not saving your games, progress or settings…".
- The update note.
- The live status for screen readers. In Advanced, it still reads the full status line.
- The game-over dialog and the wave note: whether the game cleared the wave.

## Open decisions

- Where the level is chosen: a new **Interface** section in the settings panel, the menu, or both.
- Whether the level is saved in `kct.settings` with the other settings. If it is, a backup holds it.
- The default level for a new player, and whether the launch menu asks for one.
- Whether Waves sets a level (for example, Guided in the first waves).
- Whether the Tutorial item uses the Guided level.
