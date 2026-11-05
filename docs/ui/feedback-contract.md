# Feedback contract

> **Status: draft.** Nothing is built yet. Companion to [Feedback](feedback.md), which covers what the module does with the moments.

This page defines how the game and the optional feedback module talk to each other: what the game sends, when it sends it, and how the module loads. Both sides must match it exactly. Change it rarely, and when an existing moment changes shape, change `v` (see [Versioning](#versioning)).

Terms (*moment*, *batch*, *anchor*) are defined in [Feedback: Terms](feedback.md#terms).

## Overview

The game says **what happened and when the player sees it**. The module decides **what to do about it**.

```
index.html (the game)                       feedback/ (optional)
─────────────────────                       ────────────────────
act(), holdResult(), showGameOver,          feedback.js
the hand's card handler, Skip ▶               listens for 'kct:moment'
   │                                          picks a cue for each batch
   └─ a batch of moments ── CustomEvent ──►   vibrates (Android), plays a sound,
      at screen time                          runs an event parallax motion

   No listener: the event goes nowhere. No error, no wait.
```

| Path | Holds |
|---|---|
| `index.html` | The game. A small `Moments` section builds and sends moments, and loads the module. |
| `feedback/feedback.js` | The feedback module. See [Feedback](feedback.md). |
| `feedback/synth.js` | The sound generator. See [Feedback: Sounds](feedback.md#sounds). |
| `feedback/palettes.js` | The sound presets for each theme palette. |

## Who owns what

| The game (`index.html`) | The module (`feedback/feedback.js`) |
|---|---|
| The moments and their facts | The rule table, the cue table and the moments of interest |
| Screen time: when each batch is sent | Derived events and the module's memory |
| The [sending gates](#sending-gates): when nothing is sent at all | Its own gates and the dropping rules |
| The `cancel`, `reset`, `speed` and `theme` messages | Variety: stakes, variants, escalation, novelty, layering, parameters |
| An empty, hidden **Sound and touch** card in Settings → Table | The card's rows, its device keys, and making its sounds with `synth.js` |

## Batches

The game sends one `CustomEvent` on `document`, named `kct:moment`, for each **batch**: the moments of one action that the player sees at the same time.

```js
document.dispatchEvent(new CustomEvent('kct:moment', { detail: {
  v: 1,                    // the contract version
  version: 1834,           // the game state version, for stale checks
  at: performance.now(),   // when the batch was sent
  anchor: 'sweep',         // when the player sees it: see Anchors
  replay: false,           // true in the replay viewer
  moments: [
    { type: 'trickWon', seat: 0, you: true, card: 'KS', trump: 'S', trickNumber: 4, totalTricks: 7,
      showdown: false, tricksWon: [2, 1, 1], caller: 1 },
    { type: 'king', seat: 0, you: true, card: 'KS', showdown: false,
      scoresBefore: [5, 6, 3], scoresAfter: [6, 6, 3] }
  ]
} }));
```

- Sending costs microseconds, and works the same with or without a listener.
- The game never waits for, or reads, a reply.

### Anchors

A batch is sent at its **screen time**, the moment the player sees it, from the call site for its anchor. The module never schedules a moment itself.

| Anchor | Where the game sends the batch |
|---|---|
| `land` | `act()`, one motion step (`Fx.step()`) after the action, when the cards land |
| `sweep` | Held from `TRICK_WON`, and sent in the next `act()`, the one that leaves Trick end, when the sweep is drawn |
| `result` | The release in `holdResult()` |
| `gameOver` | `showGameOver` |
| `tap` | At once, in the tap's handler |

- **A game that ends mid-trick.** When a King point reaches 10, there is no next `act()` to send the held `sweep` batch. The game moves that trick's `trickWon` and `king` moments into the `gameOver` batch instead.
- **Reduced motion.** The system's reduced-motion setting turns off the motion, so screen time is the same as engine time and batches are sent at once.

## Moments

Every moment carries `type`, plus `seat` and `you` where a seat is involved. **You** means your seat, including while the AI plays it (autoplay).

**All facts are public.** The game builds them from the View for your seat, never from the full game state, so no moment can reveal a card someone holds unseen. The game's seed is never sent: it would reveal the deal.

| `type` | Anchor | Engine source | Facts |
|---|---|---|---|
| `deal` | `land` | `DEAL`, `SHOWDOWN_DEAL` | `showdown` |
| `flip` | `land` | The kitty card turned up | `card` |
| `discard` | `land` | `DISCARD`, `EXCHANGE_DISCARD`, `SHOWDOWN_DISCARD` | `seat`, `you`, `count` |
| `trumpNamed` | `land` | An accept or a named suit | `seat`, `you`, `trump`, `round` |
| `cardPlayed` | `land` | `CARD_PLAYED` | `seat`, `you`, `card`, `showdown` |
| `trickWon` | `sweep` | `TRICK_WON`, `SHOWDOWN_TRICK_WON` | `seat`, `you`, `card`, `trump`, `trickNumber`, `totalTricks`, `showdown`, `tricksWon` (each seat's count after this trick, as the circles show), `caller` |
| `king` | `sweep` | `KING_SCORED` | `seat`, `you`, `card`, `showdown`, `scoresBefore`, `scoresAfter` |
| `handScored` | `result` | `HAND_SCORED` | `winner`, `you`, `outcome`, `points`, `caller`, `tricks`, `scoresBefore`, `scoresAfter` |
| `showdownCalled` | `result` | `SHOWDOWN_STARTED` | `players`, `mediator`, `youPlay`, `youMediate` |
| `showdownScored` | `result` | `SHOWDOWN_SCORED` | `winner`, `loser`, `you`, `youMediate`, `tricks`, `scoresBefore`, `scoresAfter` |
| `gameEnded` | `gameOver` | `GAME_ENDED` | `winner`, `you`, `scores`, `mode`, `byKing` |
| `waveCleared` | `gameOver` | The wave line of the game-over dialog | `wave`, `finalWave` |
| `cardPicked` | `tap` | Your tap on a card in your hand, for a discard | `card`, `picked` |
| `skipPressed` | `tap` | Your tap on **Skip ▶** | `youMediate` |

- **Scoring facts.** Every moment that changes a score carries `scoresBefore` and `scoresAfter`, with all three seats. Definitions such as "lead change" then live in the module, and refining them needs no change to the game.
- **Derived facts.** Facts that need game knowledge are worked out by the game and sent with the moment: `byKing` (the game ended on a King point) and `finalWave` (the last wave of the Waves table). More are added as the [moments of interest](feedback.md#moments-of-interest) are settled, such as `maxDeficit` and `kingsThisGame`.
- **Events that never become moments:** `GAME_STARTED`, `TRICK_STARTED`, `BIDDING_ROUND`, `DISCARDS_COMPLETE`, `KITTY_TRANSFER`, `SCORE_CHANGED`, `BID_PASS`, `HAND_VOID` and `HAND_ABANDONED`. Each either comes with a moment that already covers it, or gets no feedback.

### Open-ended types

The table above is the starting vocabulary, not a closed set.

- **The module ignores any type it doesn't know, and any field it doesn't use.** The game can send a new type, or a new fact on an existing type, without breaking an older module.
- Every new type follows the same rules: public facts only, sent at its screen time, and listed in this table.
- Types that start with `derived:` are reserved for the module's [derived events](feedback.md#derived-events). The game never sends one.

## Control messages

Sent on the same event, with `moments` empty and a `control` field:

| `control` | When the game sends it | What the module does |
|---|---|---|
| `cancel` | A new state version, **Next hand**, Exit, a new game, a resume, a jump in the replay viewer. `scope: 'game'` for a new game, a resume or a jump; `scope: 'step'` otherwise. | Clears armed cues and stops sounds not yet started. With `scope: 'game'`, also clears its memory. |
| `reset` | **Reset this tab** in Settings → Table | Sets its settings back to Off |
| `speed` | The speed changes, with `speed: 'instant'` or another value | At Instant, cancels and stops a running pattern or motion |
| `theme` | At load, after `kct:feedback-ready`, and on every felt change, with `felt: 'classic'`, `'spring'`, `'summer'`, `'fall'` or `'winter'` | Switches to that felt's [palette](feedback.md#theme-palettes) |

## Sending gates

The game sends **no batch at all** while any of these is true:

| Condition | Checked with | Notes |
|---|---|---|
| Speed is **Instant** | `app.ui.speed` | In live games and the replay viewer. No setting overrides it. |
| Skip ▶ is running | `skipping()` | The `showdownScored` batch is still sent when the skip ends. Skipping isn't speed Instant. |
| A game is resumed or reloaded | `resume` | A restored game never sends a past moment. |
| A jump or single step in the replay viewer | `watchTick` | |
| The menu or a question is open | `app.menuOpen`, `askDone` | The game waits, so no moments happen. |
| Another tab is more current | `TabLock.stale` | |

The module's own gates are in [Feedback: Gates](feedback.md#gates).

## Loading the module

1. When the browser is idle after page load (`requestIdleCallback`, or a short `setTimeout` where it's missing), the game adds `<script src="feedback/feedback.js">`.
2. It is a classic script, not a module import: a local copy opened from `file://` blocks module imports.
3. If the file is missing, the script fails to load and nothing else happens. The browser may still list the failed request in its developer tools; the page can't prevent that, and players never see it.
4. The module adds its `kct:moment` listener, then announces itself with a `kct:feedback-ready` event that carries its `v` (see [Messages from the module](#messages-from-the-module)).
5. On `kct:feedback-ready` with a matching `v`, the game shows the **Sound and touch** card, the module fills it in, and the game sends `theme` and `speed`.
6. Buttons and the table never wait for any of this.

## Settings in two files

- The game's Settings markup has an empty card, `#setFeedback`, under the heading **Sound and touch**, both hidden by default.
- The module adds the rows from [Feedback: Settings](feedback.md#settings) and handles them. It keeps its device keys itself.
- Without the module, the heading and card stay hidden, so Settings never offers a choice that does nothing.
- **Reset this tab** sends `reset`. Its description text names Sound and touch only while the module is loaded.

### The markup the module may use

The module builds its rows from the game's own Settings markup, so they look and behave like every other row. The game keeps these classes and shapes stable. Changing one means changing the module in the same pull request, and `settings.js` checks the rows with the module loaded.

| Row | Markup |
|---|---|
| A switch | `<label class="set-row"><span class="set-text"><span class="set-name">…</span><span class="set-desc">…</span></span><input class="sw" type="checkbox" id="…"></label>` |
| A choice | `<div class="set-row"><span class="set-text"><label class="set-name" for="…">…</label><span class="set-desc">…</span></span><select id="…">…</select></div>` |

- Row ids start with `setFb`, such as `setFbVibration`, so they never collide with the game's.
- The module adds no CSS of its own. The game's Settings styles, light and dark themes and Color-blind safe colors apply as they do to every row.
- A row that doesn't apply, such as **Sound in replays** while Sound is Off, is hidden, not dimmed.

### Device keys

The module's three settings use `localStorage` keys with the game's `kct.` prefix:

| Setting | Key | Values |
|---|---|---|
| Vibration | `kct.feedback.vibration` | `on`, or absent for Off |
| Sound | `kct.feedback.sound` | `half` or `full`, or absent for Off |
| Sound in replays | `kct.feedback.replaySound` | `on`, or absent for Off |

- **Erase covers them.** **Progress + settings** and **Everything + game files** in **Settings → Tools → Your data** already erase every `kct.` key and reload the page, so the module's settings go to Off with the rest. The choices that erase progress only leave them as they are, as they leave every other setting. No message is needed.
- **In a backup.** A backup holds every `kct.` key (`index.html`, section 5e), so these go with it, like the felt and every other setting. Restoring on another device brings the Vibration and Sound choices along. A device without vibration simply hides that row.
- Absent means Off, so a device that never turned feedback on stores nothing.

## Messages from the module

The module sends events on `document` too. The game listens, and never depends on them.

| Event | When | Detail | What the game does |
|---|---|---|---|
| `kct:feedback-ready` | Once, after the module adds its listener | `v` | Shows the **Sound and touch** card if `v` matches, then sends `theme` and `speed` |
| `kct:feedback-log` | Something the Event log should record | `v`, `kind`, `data` | Passes it to the game's logger as `Logger.log('FEEDBACK_' + kind, data)`. The logger records it only while the Event log is on. |

Log kinds:

| `kind` | When | `data` |
|---|---|---|
| `SOUND_MISSING` | A sound has no rendered preset after the fallbacks, once a page load for each sound | `{ name, palette }` |
| `RENDER_FAILED` | A preset threw while rendering | `{ name, palette, error }` |
| `FILE_MISSING` | `synth.js` or `palettes.js` failed to load | `{ file }` |
| `RENDER_SLOW` | A preset took longer than `RENDER_BUDGET_MS` to render | `{ name, palette, ms }` |

- The module never writes to the console for any of these, so a local copy without `feedback/` stays clean.
- The game ignores a kind it doesn't know.

## Versioning

- `v` is on every batch and on `kct:feedback-ready`.
- **`v` changes only when an existing moment changes shape:** a field renamed, removed or given a new meaning, or a control message changed. Adding a type or a field leaves `v` as it is.
- If the module's `v` doesn't match the game's, the module ignores every batch and leaves the card hidden. A mismatched pair is silent, never wrong.

## Other listeners

`kct:moment` is open to any optional listener, and each one ignores what it doesn't use. A listener outside `feedback/` doesn't share the module's rule table, so it can't take part in a combined cue. Common parallax ([#185](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/185)) doesn't listen at all (see [Feedback: Parallax](feedback.md#parallax)).

## Code in `index.html`

- A new section, `Moments`, after section 7b (`Fx`), with its own banner and `Tests:` line.
- `Moments.build(events, view)`: a pure function from an action's events and the View for your seat to moments, with their anchors and derived facts.
- `Moments.send(anchor, moments)` and `Moments.control(name, data)`: send a batch or a control message.
- `Moments.load()`: adds the module's script when the browser is idle.
- Call sites: `act()` after `narrate`, the release in `holdResult()`, `showGameOver`, the hand's card handler, Skip ▶, the speed picker, the Felt tiles, **Reset this tab**, and every place that cancels.
- Settings markup: the hidden **Sound and touch** heading and the empty `#setFeedback` card.
- A `kct:feedback-log` listener that passes each message to `Logger.log`.

## Tests

| Change | Tier | Scripts |
|---|---|---|
| `Moments` in `index.html` | T1 | A new `moments` area in `selftest.js`: each Engine event gives the right moments and anchors; no moment carries a fact the View doesn't show; the sending gates send nothing |
| The contract | T1 | `tests/feedback.js`: the moment types and fields match between the two files; a `v` mismatch keeps the module silent; an unknown type or field is ignored; each log kind reaches the game's logger |
| Erase and backup | T1 | `resets.js`: **Progress + settings** clears the three `kct.feedback.` keys, and the choices that erase progress only keep them. `backup-ui.js`: a backup carries them and a restore brings them back. |
| The Settings card | T1 | `settings.js`: hidden without the module, filled in with it |

The `Moments` banner gets a `Tests:` line, and `CLAUDE.md` and `tests/README.md` list the new area.
