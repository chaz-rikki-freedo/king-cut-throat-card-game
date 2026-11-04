# Feedback: vibration and sound

> **Status: draft.** Planning for [#184 Haptics](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/184) and [#183 Sound effects](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/183). Nothing here is built yet. Items marked **Open** need a decision before the code starts.

*Feedback* is what the game does besides drawing the table: a short vibration or a short sound at a game moment. This page defines the cues, when each one plays, when nothing plays, and what is dropped when cues collide. Vibration and sound read the same cue table, so they never disagree about what happened.

Moment names come from [Game moments](moments.md). Area and part names come from [Vocabulary](vocabulary.md).

## Principles

1. **Feedback is a bonus.** The game never depends on it. Safari on iOS has no vibration, and a phone can be on silent. Every cue repeats something the table already shows.
2. **Keep it rare.** A cue that plays all the time becomes noise. Vibration is kept for moments that matter to you. Sound can mark more moments, but quietly.
3. **Follow the screen.** A cue plays when the player *sees* the moment, not when the Engine applies it.
4. **Drop, never wait.** A cue that can't play on time is dropped. Nothing is queued for later.

## Channels

| Channel | API | Supported on | Default | Notes |
|---|---|---|---|---|
| Vibration | `navigator.vibrate(pattern)` | Chrome on Android, including the installed app | Off | A new call replaces the pattern still running. Not supported on iOS. |
| Sound | Web Audio (`AudioContext`) | All supported browsers | Off | Sounds are made in code with oscillators, so there are no files to load, cache or decode. Never use `<audio>` elements. |

## Settings

The switches are in **Settings → Table**, under a new heading, **Sound and touch**.

| Row | Control | Shown when | Description text (draft) |
|---|---|---|---|
| **Vibration** | Switch | `navigator.vibrate` exists | Short vibrations when it's your turn, when you win a trick and at the end of a game. |
| **Sound** | Switch | Always | Short sounds for cards, tricks and results. |
| **Volume** | Slider | Sound is on | **Open:** keep the slider, or rely on the device volume. |

- Both switches are kept on the device only: one `localStorage` key each, read inside `try`, the same way as the Awards switch. They are not part of `saveSettings()`, a game save or a backup.
- **Reset this tab** turns both off. Its description text changes to include Sound and touch.
- **Open:** one switch for both channels, or two. Recommended: two. People often want vibration while the sound is off.

## Timing

### Three clocks

| Clock | Meaning | Where it happens |
|---|---|---|
| **Engine time** | `act()` applies an action and its events exist. | `act()` in section 8 |
| **Screen time** | The player sees the result: a card lands, a trick is swept, a result shows. | The end of an `Fx` motion, the release of `holdResult()`, and the wait before `showGameOver` |
| **Tap time** | The player taps something. | Input handlers in section 8 |

Game cues are tied to screen time. Cues for your own taps are tied to tap time. Engine time is only where a cue is *scheduled*.

### Pacing by speed

From `DELAYS` and `Fx.STEP`, in milliseconds.

| Speed | Bot move (`ai`) | Trick end, manual (`trick`) | Trick won (`won`) | System step (`sys`) | One motion step |
|---|---|---|---|---|---|
| Slow | 1056 | 2024 | 1672 | 528 | 616 |
| Normal | 572 | 1232 | 968 | 308 | 396 |
| Fast | 220 | 650 | 470 | 120 | 250 |
| Instant | 0 | 0 | 0 | 0 | 0 |

At Fast, a bot card can land every 220 ms. That suits a short sound, but it is too often for vibration.

## Cues

**Rank** sets which cue plays when one action causes several moments: a lower number wins. **Who** is the seat a vibration is for. Sound plays for any seat unless the table says otherwise.

| Rank | Cue | Moment and source | Tied to | Vibration | Sound |
|---|---|---|---|---|---|
| 1 | `gameWin` | Game over, `GAME_ENDED`, you won | The game-over dialog opens | `[60, 40, 60, 40, 120]` | Yes |
| 1 | `gameLoss` | Game over, `GAME_ENDED`, a bot won | The game-over dialog opens | `[150]` | Yes |
| 2 | `waveCleared` | Game over in Waves, the wave is cleared | The game-over dialog opens | Replaces `gameWin`. **Open:** its own pattern. | Yes, distinct |
| 3 | `showdownCalled` | Showdown setup, `SHOWDOWN_STARTED` | `holdResult()` releases | `[80, 60, 80]`, if you play in it | Yes, distinct |
| 4 | `showdownResult` | Showdown result, `SHOWDOWN_SCORED` | `holdResult()` releases | `[60, 40, 60]`, if you play in it | Yes |
| 5 | `handResult` | Hand result, `HAND_SCORED` | `holdResult()` releases | **Open:** none, or `[40]` if you won the hand | Yes |
| 6 | `king` | Trick end, `KING_SCORED` | The trick sweep | `[35, 60, 35]`, yours only | Yes, distinct. **Open:** for bots too. |
| 7 | `trickWon` | Trick end, `TRICK_WON` or `SHOWDOWN_TRICK_WON` | The trick sweep | `[35]`, yours only | Yes, soft |
| 8 | `trumpNamed` | Round 1 or 2 bid, an accept or a named suit | The bid shows | None | Yes |
| 9 | `yourTurn` | Trick play or Showdown play, your turn | The previous card lands | `[20]` | **Open** |
| 10 | `cardPlayed` | Trick play, `CARD_PLAYED` | The card lands | None | Yes, short and quiet |
| 10 | `deal` | Deal or Showdown deal, `DEAL` or `SHOWDOWN_DEAL` | The deal motion | None | Yes, once for the deal |
| 10 | `flip` | Turn-up, the kitty card turned up | The flip ends | None | Yes |
| 11 | `discard` | Opening, kitty or Showdown discard | The cards reach the pile | None | Yes, soft |
| 11 | `pass` | Round 1 or 2 bid, `BID_PASS` | The pass shows | None | **Open** |

### Cue rules

- **Your turn.**
  - It plays only when the state version changes, so a redraw, a speed change or closing the menu never repeats it.
  - It does not play right after your own move, such as your next discard.
  - It does not play when Forced plays picks the card for you.
  - **Open:** whether it plays in bidding. Recommended: only for the first bid of each hand.
- **A game that ends mid-trick** (a King point reaches 10) plays only `gameWin` or `gameLoss`, never `king` and `trickWon` as well.
- **A Showdown hand.** `showdownCalled` replaces `handResult`, because both come from the same action.
- **The Mediator.** **Open:** whether `showdownCalled` and `showdownResult` vibrate while you only watch. Recommended: no.
- **Events that never cue:** `GAME_STARTED`, `TRICK_STARTED`, `BIDDING_ROUND`, `DISCARDS_COMPLETE`, `KITTY_TRANSFER` and `SCORE_CHANGED`. Each comes with another event that already cues.
- **Hand void and Hand abandoned.** **Open:** a sound, or nothing.

### Taps

| Tap | Vibration | Sound |
|---|---|---|
| A card picked or unpicked | **Open:** 5 to 10 ms, under its own switch, or none | **Open** |
| A move the rules refuse (`act()` returns `ok: false`) | None | **Open** |
| Next hand, Deal the Showdown, Skip ▶ | None | **Open** |
| Buttons, the menu, Settings | None | None |

## Gates

No cue plays when any of these is true.

| Condition | Checked with | Notes |
|---|---|---|
| The channel's switch is off | Its `localStorage` key | |
| The channel isn't supported | `typeof navigator.vibrate`, `window.AudioContext` | |
| No tap yet on this page load | `navigator.userActivation.hasBeenActive` | Browsers block both channels until then. If the property is missing, the channel stays quiet. |
| Speed is **Instant** | `app.ui.speed` | |
| Skip ▶ is running | `skipping()` | `showdownResult` still plays when the skip ends. |
| The AI plays your seat | `app.ui.autoplay` | `yourTurn` is off. **Open:** your other cues. |
| The replay viewer | `watch` | No vibration. **Open:** sound. Jumps never cue. |
| A game is resumed or reloaded | `resume` | A restored game never plays a past cue. |
| The menu or a question is open | `app.menuOpen`, `askDone` | The game waits, so no moments happen. |
| Another tab is more current | `TabLock.stale` | |
| The tab is hidden | `document.hidden` | |

The system's reduced-motion setting turns off the motion, so screen time is the same as engine time and cues play at once. Reduced motion does not turn feedback off.

## Dropping

Each cue carries the screen time it belongs to. When it is due, it goes through these checks in order:

1. **Stale.** The state version changed, the tab is hidden or another tab is more current. Drop it.
2. **Late.** More than `LATE_MS` past its moment. Drop it.
3. **Too soon.** Less than the channel's minimum gap since its last cue. Drop it, unless it ranks higher, in which case it replaces the last cue.
4. **Too many sounds.** `MAX_VOICES` sounds are already playing. Drop it.
5. Otherwise, play it once. Nothing is kept for a retry.

A redraw from a new action, **Next hand**, Exit, a new game or a jump in the replay viewer cancels every scheduled cue.

| Constant | Draft value | Meaning |
|---|---|---|
| `LATE_MS` | 80 | How late a cue may be and still play. |
| `GAP_VIBRATE_MS` | 150 | The minimum time between two vibrations. |
| `GAP_SOUND_MS` | 60 | The minimum time between two sounds. |
| `MAX_VOICES` | 4 | The most sounds that play at once. |

## Performance

- Vibration costs microseconds on the main thread. The device does the vibrating.
- Sound plays on the audio thread. A busy main thread can only delay when a sound starts, and `LATE_MS` drops a sound that starts too late.
- The `AudioContext` is created or resumed on the first tap, never during a game moment.
- Sounds are scheduled on `audioContext.currentTime`, not on extra `setTimeout`s.
- Nothing is decoded when it plays. Oscillator sounds need no decoding.

## Code

- One module, `Feedback`, in a new section of `index.html` after section 7b (`Fx`). The game stays in one file: a separate script would not load in a local copy or offline without changes to `sw.js` and `tools/publish.sh`.
- `Feedback.cueFor(events, ctx)`: a pure function that turns an action's events into at most one cue for each channel. The self-test covers it.
- `Feedback.play(cue, ctx)`: applies the gates and the dropping rules, then plays the cue on each channel.
- The vibration patterns, the sound definitions and the dropping limits are named constants in the module.
- Call sites: `act()` after `narrate`, the your-turn branch of `schedule()`, the release in `holdResult()`, and `showGameOver`.

## Tests

| Change | Tier | Scripts |
|---|---|---|
| The `Feedback` module | T1 | A new `feedback` area in `selftest.js`: cue ranks, seat filters, gates, and dropping with a fake clock and stubbed `navigator.vibrate` and `AudioContext` |
| The Settings rows | T1 | `settings.js` |
| Reset this tab | T1 | `resets.js` |
| On a phone | By hand, once | Vibration patterns on Android, and whether sound adds any delay at Fast |

The new section's banner gets a `Tests:` line, and `CLAUDE.md` and `tests/README.md` list the new area.

## Open questions

1. One switch for both channels, or two (recommended: two).
2. A Volume slider, or the device volume only.
3. `yourTurn` in bidding (recommended: the first bid of each hand only), and whether it has a sound.
4. Vibration for a won hand (`handResult`).
5. Showdown vibrations while you are the Mediator (recommended: no).
6. Sound for a bot's King point.
7. Sound in the replay viewer.
8. Your trick and King cues while the AI plays your seat.
9. A pattern for `waveCleared`.
10. Feedback for picking a card, and under which switch.
11. Sounds for a pass, Hand void, Hand abandoned and a refused move.
