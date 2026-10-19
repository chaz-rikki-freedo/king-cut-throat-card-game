# UI plan: replays, seeds, backup and themes

Status: **agreed**, in phases. All five phases are built. This page records where each feature that the code already has, but the interface does not show, goes in the interface. Give a new part a name in the [vocabulary](vocabulary.md) before you build it.

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
| Circular arrow (small) | Sit icon | `watch-seat` | In the replay viewer only, after a seat's name: watch from that seat. |

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

In every mode: **Watch** (dimmed for a game with no replay code), **Try again**, **New deal** and **Export**, each a text label with no icon. After a win that opens the next wave, also **Next wave**, as the main button; otherwise **New deal** is the main button.

- **New deal** in Free play and Dynamic finds a new seed that seats the same two opponents in the same seats, because the seed picks the table.
- **Export** opens a small dialog: **Copy seed** and **Copy replay code**.
- The results dialog has **✕** (Back) in its top right instead of a View table button.

### Settings → Tools

The Seed row (seed readout and **Copy**) is removed.

### Replay viewer (phase 2 and 3)

A read-only table. It saves nothing, records no results and runs no bots. The game timer waits, as it does while the menu is open.

- **Controls:** five icon buttons, symmetrical round Play: Previous hand, Back, Play or Pause, Forward, Next hand. No move count. A move is one Engine step: a decision, or a step of the table such as a deal. A hand stop is the step after the hand's deal (after a redeal, the deal that is played); the first stop is the table after `START_GAME`, the last the game's end. Back rebuilds from the seed (`Replay.cursor().seek`). A jump draws the table at once; one step forward moves the cards as in a game. Keys: Left and Right step, Space or Enter plays or pauses, Escape exits.
- **Discards:** a discard by the seat at the bottom (the opening discard, the exchange or a Showdown discard) takes two steps: its cards rise as selected (`ui.selected`), then the move is made. Back while they are raised lowers them; a jump or a seat change drops them. Play holds them for a trick's wait. The other seats' discards are backs, so they show as moves only.
- **Mode chip:** **Replay ✕**. It is **Exit**.
- **Log:** the Latest Scroll narrates the replay, from a line that names the table. A jump narrates without toasts. Exit brings back the log of the game behind.
- **Watch from another seat** (phase 3): tap a side seat's figure or name (a small circular arrow follows it) to sit there. That seat moves to the bottom with its own view (`buildView(state, seat)`): its hand face up, the other two as backs, so a view still holds only what its seat can see. The others keep the seating order: the next seat sits on the left. Tap your own seat to come back. Real names stay ("You" is always you), and the log does not change. `Render` places each seat by `posOf`, and the three seat panels take the id of the seat drawn in them, so `Fx` finds `#seat` + *n* wherever it sits. Only in the viewer, never in a live game.
- **Exit** (the mode chip, or Escape) returns to where you were: the menu, the game-over dialog, or a game that you can resume.
- **`?replay=` link:** opens the viewer for that code, as `?seed=` starts a game. A code that does not decode opens the menu with a note. The app removes `replay` from the address after use.

### Backup (phase 4)

File only. **Settings → Tools**, last: a **Your data** card, under Diagnostics.

| Row | Control |
|---|---|
| Back up | **Save file**: a `king-cut-throat-backup-<date>.kct` file that holds the backup code. |
| Restore | **Choose file…**, then the confirm. |

No Copy code and no paste box: a full backup is about 16 KB of text, too long to paste well on a phone. The picker takes any file, and the app decides what is a backup; an older `.json` backup still restores. The confirm (**Replace all data?**) shows this device and the backup side by side (when saved, waves unlocked, games played, saved games, replays) and says that there is no undo. **Cancel** has the focus; **Replace all data** is red. A file that is not a backup opens no confirm: a note under the rows says that nothing changed (see [backup.md](../backup.md), section 5).

### Themes (phase 5)

**Settings → Game → Theme**, the first setting of the Game tab, saved in `kct.settings` (`felt`, `colors`):

- **Felt:** a tile for each felt pack, drawn in that felt: Classic (the default green), Spring (lilac), Summer (sea teal), Fall (russet, with a navy Showdown felt) and Winter (slate). A felt sets the surface tokens: the page, the felt, its edge, the panels (`--sheet`) and the muted text.
- **Color-blind safe colors:** a switch that lays the `colorblind` color pack over any felt. It sets the names, the mode chips and the selection so that no pair collides with deuteranopia or protanopia; with it on, none of the known color-blind problems remain.
- The packs are JSON in the head (`#themePacks`). A small script there (`#themeBoot`) applies the saved theme before the page draws and sets `<meta name="theme-color">`; the game script calls the same `apply`.
- `palette.js` checks every felt, alone and with every color pack, in CI (see [colors.md](colors.md#theme-packs)).
- The surfaces that were written as colors (the profile tooltip, the Advanced UI panels, the empty out-pile) now use tokens, so they follow the felt. The Settings panel keeps its own dark palette under every theme.
- No High contrast theme (not wanted).

## Phases

| Phase | Contents |
|---|---|
| 1 | The winner line. The Seed row removed. The end buttons (Watch dimmed, Try again, New deal, Export), Back in the results dialog, and the Try again icon on the Last games rows. |
| 2 | The replay viewer from your seat: Watch turns on, a Watch icon on the Last games rows, and the `?replay=` link. |
| 3 | Watch from another seat in the viewer (tap a seat). |
| 4 | The backup UI. |
| 5 | Themes: the felts (Classic and the four seasons) and Color-blind safe colors. |

## Not in this plan

The UI levels (Normal, Guided) and the Tutorial. See [UI levels](levels.md).
