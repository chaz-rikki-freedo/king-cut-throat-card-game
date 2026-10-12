# UI wiki

This wiki names every area of the King Cut-Throat interface and every part inside each area. Use these names in issues, pull requests, code comments and design notes, so that one word always means one thing.

The vocabulary supports the planned **UI levels**: four versions of the interface that show more or less help text. See [UI levels](levels.md).

## Pages

| Page | Contents |
|---|---|
| [Vocabulary](vocabulary.md) | The name, code anchor and text kind of each area and part. |
| [UI levels](levels.md) | The four UI levels, the text kinds, and a draft of what each level shows. |
| [Game moments](moments.md) | The names of the steps of a hand, and what the action bar asks at each step. |

## How the interface is built

The interface has six layers. A higher layer covers the layers below it.

```
 ┌──────────────────────────────────────────────────────────┐
 │ Top bar   [Menu] King Cut-Throat [Mode chip] [Trump chip] │
 │           [Hand chip]                 [Speed] [Settings]  │
 ├───────────────────────────────────────────┬──────────────┤
 │ Table                                     │ Log panel    │
 │  ┌ West seat ┐   ┌ Center ┐   ┌ East seat ┐│ (Latest      │
 │  │           │   │ piles  │   │           ││  Scroll)     │
 │  │           │   │ trick  │   │           ││              │
 │  └───────────┘   │ status │   └───────────┘│              │
 │                  └────────┘                │              │
 │  ┌ Your seat ───────────────────────────┐  │              │
 │  │ Your head · Action bar · Hand        │  │              │
 │  └──────────────────────────────────────┘  │              │
 └───────────────────────────────────────────┴──────────────┘
 Layers above the table, bottom to top:
   Settings panel → Dialog layer (#overlay) → Confirm layer (#askLayer)
   Notices (toasts, update note) float on top of everything.
```

On a screen narrower than 1,150 px, the log panel moves below the table.

## Naming rules

- **Hierarchy.** A *layer* holds *regions*. A region holds *areas*. An area holds *parts*. Example: the table layer, the Your seat region, the action bar area, the prompt part.
- **One name for each thing.** Use the name in the **Term** column of the vocabulary. The **Also called** column lists names to avoid.
- **Player words.** The words that a player sees in the game (Kitty, Outside pile, Namer, Mediator, Showdown) are the canonical names. Code names that differ (`receiver`, `caller`, `duelist`) are listed as code anchors only.
- **Seats.** *West* is seat 1 (your left), *East* is seat 2 (your right), *Your seat* is seat 0. Write "a bot's seat" for West or East.
- **Dialog or panel.** A *dialog* is modal and covers the table (the menu, Rules, Game over). A *panel* slides in and the game keeps running behind it (Settings). A *confirm dialog* is a yes/no question in the confirm layer.
- **Notice.** A message that is not modal and needs no answer: a toast, the update note.
- **New parts.** Give a new part a name in the vocabulary before you build it, and give it a stable `id` or class that matches the name.

## Related documents

- [README](../../README.md): what each control does, for players.
- [Backup specification](../backup.md) and [Replay code](../replay-code.md): data formats behind the backup and replay features.
