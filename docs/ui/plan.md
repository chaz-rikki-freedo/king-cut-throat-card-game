# UI plan: replays, seeds, backup and themes

Status: **agreed**, in phases. Phases 1 and 2 are built. This page records where each feature that the code already has, but the interface does not show, goes in the interface. Give a new part a name in the [vocabulary](vocabulary.md) before you build it.

## Principles

- **No codes in the interface.** No seed or replay code shows as text. The only way to get one is **Export**, at the end of a game. A player who wants to share a game uses the copied code in a link (`?seed=` or `?replay=`).
- **The same end buttons in every mode.** Watch, Try again, New deal and Export. Only a won wave adds one: Next wave. The menu is the header's ☰ button, so the end buttons have no Menu.
- **Small icons on the lines they act on.** A game's actions sit on that game's line: the row in Your profile, or the end buttons of the game just played.

## Icons

| Icon | Name | Action | Meaning |
|---|---|---|---|
| Counter-clockwise arrow | Try again | `replay-seed` | Play the same table again: the same mode, wave, opponents, deals and house rules. |
| Shuffle arrows | New deal | `new-deal` | New cards at the same table: the same wave, or the same two opponents in the same seats. |
| Up arrow from a tray | Export | `export` | Copy the seed or the replay code. |
| Eye | Watch icon | `replay-watch` | Watch the game in the replay viewer. |
| Circular arrow (small) | Rotate icon | `replay-rotate` | In the replay viewer only: watch from the next seat. |

Each icon button has an `aria-label` and a `title`, because it has no visible text.

## Where each feature goes

### Latest Scroll: the codes

At the end of a game, the winner line congratulates the winner ("🏆 Congratulations! You win the game with 10 points." or "🏆 Congratulations to Viv, who wins the game with 10 points."). The Latest strip shows only that line. The new-game line no longer shows the seed.

### Your profile: Last games table

Each row of **Show these games as a table** ends with two icons:

- **Try again icon.** Starts the same table again. A Dynamic game starts from the profile snapshot in its replay code (`dyn.snap`). If that mode has an unfinished game that has begun, the app asks first, as **New game** does.
- **Watch icon.** Opens the replay viewer. Exit returns to Your profile.

A row whose code this app cannot read (a newer rules version, or no mode) shows no icons.

### Game-over end buttons

In every mode: **Watch** (dimmed for a game with no replay code), **Try again**, **New deal** and **Export**, each an icon and a label. After a win that opens the next wave, also **Next wave**, as the main button; otherwise **New deal** is the main button.

- **New deal** in Free play and Dynamic finds a new seed that seats the same two opponents in the same seats, because the seed picks the table.
- **Export** opens a small dialog: **Copy seed** and **Copy replay code**.
- The results dialog has **✕** (Back) in its top right instead of a View table button.

### Settings → Tools

The Seed row (seed readout and **Copy**) is removed.

### Replay viewer (phase 2 and 3)

A read-only table. It saves nothing, records no results and runs no bots. The game timer waits, as it does while the menu is open.

- **Controls:** five icon buttons, symmetrical round Play: Previous hand, Back, Play or Pause, Forward, Next hand. No move count. A move is one Engine step: a decision, or a step of the table such as a deal. A hand stop is the step after the hand's deal (after a redeal, the deal that is played); the first stop is the table after `START_GAME`, the last the game's end. Back rebuilds from the seed (`Replay.cursor().seek`). A jump draws the table at once; one step forward moves the cards as in a game. Keys: Left and Right step, Space or Enter plays or pauses, Escape exits.
- **Mode chip:** **Replay ✕**. It is **Exit**.
- **Log:** the Latest Scroll narrates the replay, from a line that names the table. A jump narrates without toasts. Exit brings back the log of the game behind.
- **Rotate icon** (phase 3): watch from You, then West, then East. Each seat shows its own view (`buildView(state, seat)`), so the rule that a view holds only what its seat can see still holds. This needs a seat-to-position map in `Render`, which today places seat 1 left and seat 2 right. Rotation is in the viewer only, never in a live game.
- **Exit** (the mode chip, or Escape) returns to where you were: the menu, the game-over dialog, or a game that you can resume.
- **`?replay=` link:** opens the viewer for that code, as `?seed=` starts a game. A code that does not decode opens the menu with a note. The app removes `replay` from the address after use.

### Backup (phase 4)

**Settings → Tools**, a **Your data** card:

| Row | Controls |
|---|---|
| Back up | **Save file** and **Copy code** |
| Restore | **Choose file** or paste a code, then **Restore…** |

**Restore…** opens a confirm dialog with the backup summary (`inspect`) and the warning that all data on this device is replaced, with no undo (see [backup.md](../backup.md), section 5).

### Themes (phase 5)

**Settings → Game → Table** gets a **Theme** list, saved in `kct.settings`. First:

1. Make the colors in [Not yet tokens](colors.md#not-yet-tokens) into tokens. A pack changes only tokens.
2. Fix the known problems of the default palette in normal vision.
3. Load a pack: embedded JSON that sets the tokens on `:root` and `<meta name="theme-color">`. `palette.js --pack` checks each pack in CI.
4. First packs: Felt (the default), High contrast and Color-blind safe.

## Phases

| Phase | Contents |
|---|---|
| 1 | The winner line. The Seed row removed. The end buttons (Watch dimmed, Try again, New deal, Export), Back in the results dialog, and the Try again icon on the Last games rows. |
| 2 | The replay viewer from your seat: Watch turns on, a Watch icon on the Last games rows, and the `?replay=` link. |
| 3 | The Rotate icon in the viewer. |
| 4 | The backup UI. |
| 5 | Themes. |

## Not in this plan

The UI levels (Normal, Guided) and the Tutorial. See [UI levels](levels.md).
