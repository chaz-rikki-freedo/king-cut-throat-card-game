# Feedback: vibration and sound

> **Status: draft.** Planning for [#184 Haptics](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/184) and [#183 Sound effects](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/183). Nothing here is built yet. Items marked **TBD** are still to be decided.

*Feedback* is what the game does besides drawing the table: a short vibration or a short sound at a game moment. This page defines the cues, when each one plays, when nothing plays, and what is dropped when cues collide. Vibration and sound read the same cue table, so they never disagree about what happened.

Moment names come from [Game moments](moments.md). Area and part names come from [Vocabulary](vocabulary.md).

## Principles

1. **Feedback is a bonus.** The game never depends on it. Safari on iOS has no vibration, and a phone can be on silent. Every cue repeats something the table already shows.
2. **Keep it rare.** A cue that plays all the time becomes noise. Vibration is kept for moments that matter to you. Sound can mark more moments, but quietly.
3. **Follow the screen.** A cue plays when the player *sees* the moment, not when the Engine applies it.
4. **Drop, never wait.** A cue that can't play on time is dropped. Nothing is queued for later.
5. **Instant turns it all off.** At speed Instant, no vibration, sound or parallax plays (parallax: [#185](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/185)). No setting overrides this, including **Sound in replays**.

## Channels

| Channel | API | Supported on | Default | Notes |
|---|---|---|---|---|
| Vibration | `navigator.vibrate(pattern)` | Chrome on Android, including the installed app | Off | A new call replaces the pattern still running. Not supported on iOS. |
| Sound | Web Audio (`AudioContext`) | All supported browsers | Off | Recorded WAV files in `sounds/`, next to `index.html` (see [Sound files](#sound-files)). Each is fetched and decoded once, after the first tap. Never use `<audio>` elements. |

## Settings

The rows are in **Settings → Table**, under a new heading, **Sound and touch**.

| Row | Control | Shown when | Default | Description text (draft) |
|---|---|---|---|---|
| **Vibration** | Switch | `navigator.vibrate` exists | Off | Short vibrations when you win a trick or a King point, pick a card, and at the end of a game. |
| **Sound** | Off, Half, Full | Always | Off | Short sounds for cards, tricks and results. Half plays them at half volume. |
| **Sound in replays** | Switch | Sound isn't Off | Off | The replay viewer plays the same sounds, at the Sound level. |

- Vibration and Sound are separate, so you can have either without the other.
- The device volume sets the overall level. Half and Full scale it inside the game.
- All three are kept on the device only: one `localStorage` key each, read inside `try`, the same way as the Awards switch. They are not part of `saveSettings()`, a game save or a backup.
- **Reset this tab** sets all three back to Off. Its description text changes to include Sound and touch.

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

**Rank** sets which cue plays when one action causes several moments: a lower number wins. **Yours** means your seat, including while the AI plays it (autoplay).

| Rank | Cue | Moment and source | Tied to | Vibration | Sound file |
|---|---|---|---|---|---|
| 1 | `waveCleared` | Game over in Waves, the wave is cleared | The game-over dialog opens | `[60, 40, 60, 40, 60, 40, 160]` | `wave-cleared` |
| 2 | `gameWin` | Game over, `GAME_ENDED`, you won | The game-over dialog opens | `[60, 40, 60, 40, 120]` | `game-win` |
| 2 | `gameLoss` | Game over, `GAME_ENDED`, a bot won | The game-over dialog opens | `[150]` | `game-loss` |
| 3 | `showdownCalled` | Showdown setup, `SHOWDOWN_STARTED` | `holdResult()` releases | `[80, 60, 80]`, if you play in it | `showdown-called` |
| 4 | `showdownResult` | Showdown result, `SHOWDOWN_SCORED` | `holdResult()` releases | `[60, 40, 60]`, if you play in it | `showdown-win` or `showdown-loss` |
| 5 | `handResult` | Hand result, `HAND_SCORED` | `holdResult()` releases | None | `hand-win` or `hand-loss` |
| 6 | `king` | Trick end, `KING_SCORED` | The trick sweep | `[35, 60, 35]`, yours only | `king-you` or `king-bot` |
| 7 | `trickWon` | Trick end, `TRICK_WON` or `SHOWDOWN_TRICK_WON` | The trick sweep | `[35]`, yours only | `trick-you` or `trick-bot` |
| 8 | `trumpNamed` | Round 1 or 2 bid, an accept or a named suit | The bid shows | None | `trump-named` |
| 9 | `cardPlayed` | Trick play, `CARD_PLAYED` | The card lands | None | `card-play` |
| 9 | `deal` | Deal or Showdown deal, `DEAL` or `SHOWDOWN_DEAL` | The deal motion | None | `deal` |
| 9 | `flip` | Turn-up, the kitty card turned up | The flip ends | None | `flip` |
| 10 | `discard` | Opening, kitty or Showdown discard | The cards reach the pile | None | `discard` |

### Cue rules

- **No your-turn cue.** The table already shows whose turn it is.
- **A game that ends mid-trick** (a King point reaches 10) plays only `gameWin` or `gameLoss`, never `king` and `trickWon` as well.
- **A Showdown hand.** `showdownCalled` replaces `handResult`, because both come from the same action.
- **The Mediator.** While you mediate, only special events vibrate. Which events count as special is **TBD**. Until then, Showdown cues don't vibrate for the Mediator, and the sounds still play.
- **Autoplay.** Your seat's cues play as if you played it yourself, vibration included.
- **Events that never cue:** `GAME_STARTED`, `TRICK_STARTED`, `BIDDING_ROUND`, `DISCARDS_COMPLETE`, `KITTY_TRANSFER` and `SCORE_CHANGED`. Each comes with another event that already cues.
- **TBD:** sounds for a pass (`BID_PASS`), Hand void, Hand abandoned, a refused move, and the Next hand, Deal the Showdown and Skip ▶ buttons.

### Taps

| Tap | Vibration | Sound |
|---|---|---|
| A card picked or unpicked | `[8]`, under the Vibration switch | None |
| Buttons, the menu, Settings | None | None (button sounds are TBD) |

## Gates

No cue plays when any of these is true.

| Condition | Checked with | Notes |
|---|---|---|
| The channel's setting is off | Its `localStorage` key | Sound: the level is Off. |
| The channel isn't supported | `typeof navigator.vibrate`, `window.AudioContext` | |
| No tap yet on this page load | `navigator.userActivation.hasBeenActive` | Browsers block both channels until then. If the property is missing, the channel stays quiet. |
| Speed is **Instant** | `app.ui.speed` | Applies to both channels and to parallax (#185), in live games and the replay viewer. No setting overrides it. |
| Skip ▶ is running | `skipping()` | `showdownResult` still plays when the skip ends. |
| The replay viewer | `watch` | No vibration. Sound plays only with **Sound in replays** on. Jumps and single steps never cue. |
| A game is resumed or reloaded | `resume` | A restored game never plays a past cue. |
| The menu or a question is open | `app.menuOpen`, `askDone` | The game waits, so no moments happen. |
| Another tab is more current | `TabLock.stale` | |
| The tab is hidden | `document.hidden` | |

The system's reduced-motion setting turns off the motion, so screen time is the same as engine time and cues play at once. Reduced motion does not turn feedback off.

## Dropping

Each cue carries the screen time it belongs to. When it is due, it goes through these checks in order:

1. **Stale.** The state version changed, the tab is hidden or another tab is more current. Drop it.
2. **Not ready.** Its sound is missing, failed to load or isn't decoded yet. Drop the sound. Vibration still plays.
3. **Late.** More than `LATE_MS` past its moment. Drop it.
4. **Too soon.** Less than the channel's minimum gap since its last cue. Drop it, unless it ranks higher, in which case it replaces the last cue.
5. **Too many sounds.** `MAX_VOICES` sounds are already playing. Drop it.
6. Otherwise, play it once. Nothing is kept for a retry.

A redraw from a new action, **Next hand**, Exit, a new game or a jump in the replay viewer cancels every scheduled cue.

| Constant | Draft value | Meaning |
|---|---|---|
| `LATE_MS` | 80 | How late a cue may be and still play. |
| `GAP_VIBRATE_MS` | 150 | The minimum time between two vibrations. A card pick ignores this gap. |
| `GAP_SOUND_MS` | 60 | The minimum time between two sounds. |
| `MAX_VOICES` | 4 | The most sounds that play at once. |
| `HALF_GAIN` | 0.5 | The volume for Half. |

## Sound files

Supply one WAV file for each name below. TBD files can come later.

| File | Cue | Plays | Length |
|---|---|---|---|
| `card-play.wav` | `cardPlayed` | Each card that lands in a trick, any seat. The most frequent sound: keep it quiet. | 80 to 150 ms |
| `deal.wav` | `deal` | Once for each deal and Showdown deal | 300 to 600 ms |
| `flip.wav` | `flip` | The kitty card turned up | 100 to 200 ms |
| `discard.wav` | `discard` | Cards reaching the outside pile or the kitty | 100 to 200 ms |
| `trump-named.wav` | `trumpNamed` | Trump accepted or named | 200 to 400 ms |
| `trick-you.wav` | `trickWon` | You win a trick | 150 to 300 ms |
| `trick-bot.wav` | `trickWon` | A bot wins a trick. Softer than `trick-you`. | 150 to 300 ms |
| `king-you.wav` | `king` | Your King point | 250 to 500 ms |
| `king-bot.wav` | `king` | A bot's King point. Distinct from `king-you`. | 250 to 500 ms |
| `hand-win.wav` | `handResult` | You win the hand | 400 to 800 ms |
| `hand-loss.wav` | `handResult` | A bot wins the hand | 400 to 800 ms |
| `showdown-called.wav` | `showdownCalled` | A Showdown is called | 500 to 1000 ms |
| `showdown-win.wav` | `showdownResult` | You win the Showdown, or you mediate and it ends | 400 to 800 ms |
| `showdown-loss.wav` | `showdownResult` | You lose the Showdown | 400 to 800 ms |
| `game-win.wav` | `gameWin` | You win the game | 1 to 2 s |
| `game-loss.wav` | `gameLoss` | A bot wins the game | 1 to 2 s |
| `wave-cleared.wav` | `waveCleared` | You clear a wave | 1.5 to 2.5 s |
| `pass.wav` | TBD | A pass in bidding | 80 to 150 ms |
| `hand-void.wav` | TBD | Hand void or Hand abandoned | 300 to 600 ms |
| `refused.wav` | TBD | A move the rules refuse | 100 to 200 ms |
| `button.wav` | TBD | Next hand, Deal the Showdown, Skip ▶ | 50 to 100 ms |

### File format

- Mono, 16-bit PCM, 22,050 Hz. A sound effect needs nothing more, and it keeps `index.html` small.
- No silence at the start, so the sound lines up with the moment. Trim the tail to where it fades out.
- Peaks at about −3 dBFS. Keep the levels matched, so no sound jumps out at Full.
- Size: one second at this format is about 44 KB. The 17 required files at the lengths above come to roughly 0.5 to 0.7 MB, outside `index.html`.

### Where the files live

- The files are in `sounds/`, next to `index.html`, and `tools/publish.sh` adds `sounds` to the files it publishes.
- **Missing files are silent.** A file that is missing or fails to load or decode is dropped: no notice, no toast and no Settings text. The game plays as if that cue had no sound. The Sound row still shows. This covers a local copy opened with only `index.html`, and a set of files that isn't complete yet.
- Nothing is written to the console for a missing file, so a local copy stays clean. The Event log, when on, records one `SOUND_MISSING` line for each file, once a page load.
- **Offline, in two steps.**
  1. **Until the full set exists:** the service worker caches each sound the first time it loads (runtime caching). An installed app that has played a sound once has it offline.
  2. **Once all 17 required files are in `sounds/`:** the service worker precaches them at install, from a `SOUNDS` list in `sw.js`, so every sound works offline from the start. Runtime caching stays for the TBD files.
- **A sound never breaks the install.** Precaching fetches each sound on its own, apart from `ASSETS`. A sound that fails to load is skipped and left to runtime caching, so the page, the manifest and the icons still install.
- A file that changes is picked up by the service worker's update check, the same as the icons.

## Performance

- Vibration costs microseconds on the main thread. The device does the vibrating.
- Sound plays on the audio thread. A busy main thread can only delay when a sound starts, and `LATE_MS` drops a sound that starts too late.
- The `AudioContext` is created or resumed on the first tap, and only while Sound isn't Off. The sounds are fetched and decoded then, in the background, one at a time, never during a game moment.
- A file that fails to load is not fetched again on that page load.
- Sounds are scheduled on `audioContext.currentTime`, not on extra `setTimeout`s.

## Code

- One module, `Feedback`, in a new section of `index.html` after section 7b (`Fx`). The code stays in one file. Only the sound files are outside it, because the game works without them.
- `Feedback.cueFor(events, ctx)`: a pure function that turns an action's events into at most one cue for each channel. The self-test covers it.
- `Feedback.play(cue, ctx)`: applies the gates and the dropping rules, then plays the cue on each channel.
- The vibration patterns, the sound table and the dropping limits are named constants in the module.
- Call sites: `act()` after `narrate`, the release in `holdResult()`, `showGameOver`, and the card-pick handler.
- `sw.js`: runtime caching for `sounds/*.wav`, then a `SOUNDS` precache list once the full set exists. `tools/publish.sh`: `sounds` in its file list.

## Tests

| Change | Tier | Scripts |
|---|---|---|
| The `Feedback` module | T1 | A new `feedback` area in `selftest.js`: cue ranks, seat filters, gates, and dropping with a fake clock and stubbed `navigator.vibrate` and `AudioContext` |
| The Settings rows | T1 | `settings.js` |
| Runtime caching of `sounds/` in `sw.js`, then the `SOUNDS` precache | T1 | `sw.js`, including an install where one sound fails to load |
| Missing files are silent | T1 | The `feedback` area: a failed fetch and a failed decode drop the cue, show nothing and leave vibration playing |
| Reset this tab | T1 | `resets.js` |
| On a phone | By hand, once | Vibration patterns on Android, and whether sound adds any delay at Fast |

The new section's banner gets a `Tests:` line, and `CLAUDE.md` and `tests/README.md` list the new area.

## Decisions

| # | Question | Decision |
|---|---|---|
| 1 | One switch or two | Two: Vibration and Sound |
| 2 | Volume | Sound is Off, Half or Full, in place of a switch |
| 3 | Your-turn cue | None |
| 4 | Vibration for a won hand | None |
| 5 | Vibration while you mediate | Special events only. Which ones: TBD |
| 6 | A bot's King point | Sound only, distinct from yours |
| 7 | Sound in the replay viewer | A separate **Sound in replays** switch, off by default |
| 8 | Your seat under autoplay | The same cues as when you play it |
| 9 | Wave cleared | Its own vibration and sound |
| 10 | Picking a card | Vibration only, under the Vibration switch |
| 11 | Pass, void, refused move, buttons | TBD |
| 12 | Reset this tab | Sets Sound and touch back to Off |
| 13 | Sound source | Recorded WAV files, supplied separately |
| 14 | Where the files live | External files in `sounds/`. The interface is silent when one is missing. |
| 15 | Speed Instant | Turns off vibration, sound and parallax, with no override |
| 16 | Offline sounds | Runtime caching until the full set exists, then precached at install |

## Still to decide

1. Which events vibrate while you mediate.
2. Sounds for a pass, Hand void, Hand abandoned, a refused move and the buttons.
