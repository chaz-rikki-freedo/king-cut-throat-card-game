# Feedback: sound and vibration

> **Status: draft.** Planning for [#184 Haptics](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/184) and [#183 Sound effects](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/183). Every decision is made. Nothing is built yet.

*Feedback* is what the game does besides drawing the table: a short sound at a game moment, or a vibration tick when you tap a card. This page defines the cues, when each one plays, when nothing plays, and what is dropped when cues collide.

Moment names come from [Game moments](moments.md). Area and part names come from [Vocabulary](vocabulary.md).

## Principles

1. **Feedback is a bonus.** The game never depends on it. A phone can be on silent or have system haptics off. Every cue repeats something the table already shows.
2. **Keep it rare.** A cue that plays all the time becomes noise. Sound marks the game's moments, quietly. Vibration is only a tick for your own card taps.
3. **Follow the screen.** A cue plays when the player *sees* the moment, not when the Engine applies it.
4. **Drop, never wait.** A cue that can't play on time is dropped. Nothing is queued for later.
5. **The iPhone is the ceiling.** Android never gets more vibration than an iPhone can give. A web page on an iPhone can only tick at a real finger tap, with no patterns and no strength (see [Vibration](#vibration)), so that is all either platform gets.
6. **Instant turns it all off.** At speed Instant, no vibration, sound or parallax plays (parallax: [#185](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/185)). No setting overrides this, including **Sound in replays**.

## Channels

| Channel | API | Supported on | Default | Notes |
|---|---|---|---|---|
| Vibration | Android: `navigator.vibrate(10)`. iPhone: a hidden switch control (see [Vibration](#vibration)). | Chrome and Chrome-based browsers on Android, Safari 18 and later on iPhone, including the installed app | Off | One tick, at a tap on a card in your hand. Nothing else vibrates. |
| Sound | Web Audio (`AudioContext`) | All supported browsers | Off | Recorded WAV files in `sounds/`, next to `index.html` (see [Sound files](#sound-files)). Each is loaded and decoded once, when the browser is idle after page load. Sound plays only after the first tap. Never use `<audio>` elements. |

## Settings

The rows are in **Settings → Table**, under a new heading, **Sound and touch**.

| Row | Control | Shown when | Default | Description text (draft) |
|---|---|---|---|---|
| **Vibration** | Switch | `navigator.vibrate` exists, or the browser supports switch controls (`'switch' in HTMLInputElement.prototype`) | Off | A short tick when you pick or play a card. |
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

At Fast, a bot card can land every 220 ms. That suits a short sound.

## Cues

Game moments play sound only. **Rank** sets which cue plays when one action causes several moments: a lower number wins. **Yours** means your seat, including while the AI plays it (autoplay).

| Rank | Cue | Moment and source | Tied to | Sound file |
|---|---|---|---|---|
| 1 | `waveCleared` | Game over in Waves, the wave is cleared | The game-over dialog opens | `wave-cleared` |
| 2 | `gameWin` | Game over, `GAME_ENDED`, you won | The game-over dialog opens | `game-win` |
| 2 | `gameLoss` | Game over, `GAME_ENDED`, a bot won | The game-over dialog opens | `game-loss` |
| 3 | `showdownCalled` | Showdown setup, `SHOWDOWN_STARTED` | `holdResult()` releases | `showdown-called` |
| 4 | `showdownResult` | Showdown result, `SHOWDOWN_SCORED` | `holdResult()` releases | `showdown-win` or `showdown-loss` |
| 5 | `handResult` | Hand result, `HAND_SCORED` | `holdResult()` releases | `hand-win` or `hand-loss` |
| 6 | `king` | Trick end, `KING_SCORED` | The trick sweep | `king-you` or `king-bot` |
| 7 | `trickWon` | Trick end, `TRICK_WON` or `SHOWDOWN_TRICK_WON` | The trick sweep | `trick-you` or `trick-bot` |
| 8 | `trumpNamed` | Round 1 or 2 bid, an accept or a named suit | The bid shows | `trump-named` |
| 9 | `cardPlayed` | Trick play, `CARD_PLAYED` | The card lands | `card-play` |
| 9 | `deal` | Deal or Showdown deal, `DEAL` or `SHOWDOWN_DEAL` | The deal motion | `deal` |
| 9 | `flip` | Turn-up, the kitty card turned up | The flip ends | `flip` |
| 10 | `discard` | Opening, kitty or Showdown discard | The cards reach the pile | `discard` |

### Cue rules

- **No your-turn cue.** The table already shows whose turn it is.
- **A game that ends mid-trick** (a King point reaches 10) plays only `gameWin` or `gameLoss`, never `king` and `trickWon` as well.
- **A Showdown hand.** `showdownCalled` replaces `handResult`, because both come from the same action.
- **The Mediator.** All the Showdown sounds play while you mediate, except during a skip.
- **Autoplay.** Your seat's sounds play as if you played it yourself. There are no ticks, because nobody taps.
- **Events that never cue:** `GAME_STARTED`, `TRICK_STARTED`, `BIDDING_ROUND`, `DISCARDS_COMPLETE`, `KITTY_TRANSFER` and `SCORE_CHANGED`. Each comes with another event that already cues.
- **No sound** for a pass (`BID_PASS`), Hand void, Hand abandoned, a refused move, or any button, including Next hand, Deal the Showdown and Skip ▶.

### Taps

| Tap | Vibration | Sound |
|---|---|---|
| A card in your hand picked or unpicked (a discard) | One tick | None |
| A card in your hand played | One tick | `card-play`, when the card lands |
| Every other tap: buttons, the menu, Settings, Skip ▶ | None | None |

A card played for you, by Forced plays or autoplay, doesn't tick: there was no tap.

## Vibration

### What each platform can do

| Platform | How a tick is made | Limits |
|---|---|---|
| iPhone, Safari 18 and later (every iPhone browser uses Safari's engine) | A real finger tap toggles a hidden `<input type="checkbox" switch>`. Safari plays its fixed system tick. | Only a real finger tap works: toggling the switch from code is silent, and iOS 26.5 reportedly closed the other routes. One fixed tick: no patterns, no length, no strength. Off when the phone's **System Haptics** setting is off. |
| Android, Chrome and Chrome-based browsers | `navigator.vibrate(10)` in the tap's handler | Matched to the iPhone tick by choice (principle 5). The API could do more, but the spec doesn't use it. |

The iPhone route is unofficial. It uses Safari's behavior for switch controls, not an Apple API, so a later iOS update can change it. If it stops working, the iPhone ceiling becomes zero, and by principle 5 Android stops ticking too.

### The overlay on iPhone

Your hand's cards are `<button>` elements, and a tap on a button inside a `<label>` doesn't toggle the label's switch. So on iPhone, each card in your hand gets an invisible switch over it:

- One `<input type="checkbox" switch>` inside each hand card's slot, covering the card, with `opacity: 0`.
- `aria-hidden="true"` and `tabindex="-1"`, so screen readers and keyboard focus still use the card's button.
- The switch's `click` handler passes the tap on to the card, so picking and playing work exactly as before.
- The overlay is added only when Vibration is on, the browser supports switch controls, and `navigator.vibrate` doesn't exist. It is limited to your hand, at most 8 cards. Android and desktop never get it.
- The overlay must not change what a tap does, a card's tap area, or how a disabled card looks.

### Unverified

Nobody has checked the overlay on a real iPhone with the current iOS yet. **It is the first step of the build:** if a real tap on the overlay doesn't tick, vibration is dropped on both platforms and only sound is built.

## Gates

No cue plays when any of these is true.

| Condition | Checked with | Notes |
|---|---|---|
| The channel's setting is off | Its `localStorage` key | Sound: the level is Off. |
| The channel isn't supported | `typeof navigator.vibrate`, switch-control support, `window.AudioContext` | |
| No tap yet on this page load | `navigator.userActivation.hasBeenActive` | Browsers block sound until then. A tick is a tap, so it always passes this gate. If the property is missing, sound stays quiet. |
| Speed is **Instant** | `app.ui.speed` | Applies to both channels and to parallax (#185), in live games and the replay viewer. No setting overrides it. |
| Skip ▶ is running | `skipping()` | `showdownResult` still plays when the skip ends. Skipping isn't speed Instant, so principle 6 doesn't silence it. |
| The replay viewer | `watch` | No ticks: you don't play cards there. Sound plays only with **Sound in replays** on. Jumps and single steps never cue. |
| A game is resumed or reloaded | `resume` | A restored game never plays a past cue. |
| The menu or a question is open | `app.menuOpen`, `askDone` | The game waits, so no moments happen. |
| Another tab is more current | `TabLock.stale` | |
| The tab is hidden | `document.hidden` | |

The system's reduced-motion setting turns off the motion, so screen time is the same as engine time and cues play at once. Reduced motion does not turn feedback off.

## Dropping

These checks apply to sounds. A tick plays at its tap with no checks beyond the [gates](#gates).

Each sound cue carries the screen time it belongs to. When it is due, it goes through these checks in order:

1. **Stale.** The state version changed, the tab is hidden or another tab is more current. Drop it.
2. **Not ready.** Its sound is missing, failed to load or isn't decoded yet. Drop it.
3. **Late.** More than `LATE_MS` past its moment. Drop it.
4. **Too soon.** Less than `GAP_SOUND_MS` since the last sound. Drop it, unless it ranks higher, in which case it replaces the last one.
5. **Too many sounds.** `MAX_VOICES` sounds are already playing. Drop it.
6. Otherwise, play it once. Nothing is kept for a retry.

A redraw from a new action, **Next hand**, Exit, a new game or a jump in the replay viewer cancels every scheduled cue.

| Constant | Draft value | Meaning |
|---|---|---|
| `LATE_MS` | 80 | How late a cue may be and still play. |
| `GAP_SOUND_MS` | 60 | The minimum time between two sounds. |
| `MAX_VOICES` | 4 | The most sounds that play at once. |
| `HALF_GAIN` | 0.5 | The volume for Half. |
| `TICK_MS` | 10 | The Android tick, matched to the iPhone tick. |

## Sound files

Supply one WAV file for each name below. These 17 files are the full set.

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
  1. **Until all 17 files exist:** the service worker caches each sound the first time it loads (runtime caching). An installed app that has played a sound once has it offline.
  2. **Once all 17 required files are in `sounds/`:** the service worker precaches them at install, from a `SOUNDS` list in `sw.js`, so every sound works offline from the start.
- **A sound never breaks the install.** Precaching fetches each sound on its own, apart from `ASSETS`. A sound that fails to load is skipped and left to runtime caching, so the page, the manifest and the icons still install.
- A file that changes is picked up by the service worker's update check, the same as the icons.

## Performance

- A tick costs microseconds on the main thread. The device does the vibrating.
- Sound plays on the audio thread. A busy main thread can only delay when a sound starts, and `LATE_MS` drops a sound that starts too late.
- The sounds load only while Sound isn't Off, when the browser is idle, one at a time, never during a game moment. Decoding uses an `OfflineAudioContext`, so it needs no tap.
- The playing `AudioContext` is created or resumed on the first tap.
- Nothing in the interface waits for the sounds. A sound that isn't loaded is dropped.
- A file that fails to load is not fetched again on that page load.
- Sounds are scheduled on `audioContext.currentTime`, not on extra `setTimeout`s.

## Order of operations

What `Feedback` does, from page load to a cue playing, in order.

### 1. Page load

1. `Feedback` reads its three device keys: Vibration, Sound and Sound in replays.
2. It checks which tick route the browser has: `navigator.vibrate`, switch controls, or none.
3. Nothing else happens yet. Buttons and the table never wait for feedback.

### 2. Loading the sounds

1. **When the browser is idle** after the page loads (`requestIdleCallback`, or a short `setTimeout` where it's missing), and only if Sound isn't Off, the module starts loading the sounds.
2. It loads them **one at a time**: download from `sounds/`, then decode with an `OfflineAudioContext`. Decoding needs no tap and logs no warning. A decoded sound plays in any audio context.
3. A file that fails to download or decode is marked missing: nothing on screen, nothing in the console, and one `SOUND_MISSING` line in the Event log when it's on. It isn't tried again on that page load.
4. **When Sound changes from Off to Half or Full,** loading starts then, if it hasn't already.
5. Ticks need no loading.

Once the service worker has cached the files, they load from the device in a few milliseconds, so they are almost always ready before the first cue. A sound that isn't ready is dropped (see [Dropping](#dropping)).

### 3. The first tap

1. A one-time `pointerdown` listener runs on the first tap anywhere on the page.
2. If Sound isn't Off, it creates or resumes the playing `AudioContext`. A change of the Sound setting is itself a tap, so it does the same.

### 4. Each action, in `act()`

1. `Engine.dispatch` applies the action and returns its events.
2. The existing work runs: `narrate`, `draw` and `schedule`.
3. `Feedback.cueFor(events, ctx)` turns the events into cues. It is a pure function:
   - It ignores the events that never cue.
   - It applies the seat rules: your seat (including autoplay), a bot's seat, and the Mediator.
   - It keeps the highest-ranked cue for each channel.
   - It returns at most one sound cue. The cue carries the state version and its anchor: a card landing, the trick sweep, a result or the game-over dialog.
4. The [gates](#gates) run. A cue that fails one is dropped at once.
5. A cue that passes is **armed** at its anchor:

   | Anchor | Where it fires |
   |---|---|
   | A card landing | `act()`, one motion step (`Fx.step()`) later |
   | The trick sweep | Armed at `TRICK_WON`. It fires in the next `act()`, the one that leaves Trick end, when the sweep is drawn. |
   | A hand or Showdown result | The release in `holdResult()` |
   | The game-over dialog | `showGameOver` |

### 5. When an armed cue is due

1. The [dropping](#dropping) checks run in order: stale, not ready, late, too soon, too many sounds.
2. A cue that passes plays once: a buffer source, through a gain node (Half or Full), started on `audioContext.currentTime`.
3. The module records the time and rank, for the next gap check.

### 6. Taps

1. **A card in your hand is picked, unpicked or played.** The card's handler calls `Feedback.tick()`, which checks the Vibration switch, Instant and another tab being more current.
2. **Android:** `tick()` calls `navigator.vibrate(TICK_MS)`.
3. **iPhone:** the tap already toggled the card's overlay switch, so Safari has played its tick. `tick()` does nothing more. Instant or another tab being more current removes the overlay, so those taps don't tick.
4. A tick has no gap check, rank or sound of its own. Playing a card also plays `card-play` when the card lands.

### 7. Cancelling

`Feedback.cancel()` clears every armed cue and stops any sound scheduled but not yet started. It runs on a new state version, **Next hand**, Exit, a new game, a jump in the replay viewer, and the tab being hidden. Nothing is kept for later.

### 8. Settings changes

| Change | What happens |
|---|---|
| Sound to Off | `cancel()`, then the playing `AudioContext` is suspended. Loaded sounds stay in memory for the page load. |
| Sound from Off to Half or Full | Loading starts if it hasn't, and the playing `AudioContext` is created or resumed. |
| Vibration off | The overlay switches are removed from your hand. Android needs nothing. |
| Speed set to Instant, or back | The overlay switches are removed, or added back. |
| Reset this tab | All three go to Off, with the effects above. |

## Code

- One module, `Feedback`, in a new section of `index.html` after section 7b (`Fx`). The code stays in one file. Only the sound files are outside it, because the game works without them.
- `Feedback.cueFor(events, ctx)`: a pure function that turns an action's events into at most one cue for each channel. The self-test covers it.
- `Feedback.play(cue, ctx)`: applies the gates and the dropping rules, then plays the cue on each channel.
- The sound table, `TICK_MS` and the dropping limits are named constants in the module.
- Call sites: `act()` after `narrate`, the release in `holdResult()`, `showGameOver`, and the hand's card handler.
- `Render`: the overlay switch in each hand card's slot, when `Feedback` asks for it.
- `sw.js`: runtime caching for `sounds/*.wav`, then a `SOUNDS` precache list once the full set exists. `tools/publish.sh`: `sounds` in its file list.

## Tests

| Change | Tier | Scripts |
|---|---|---|
| On an iPhone, first | By hand, before anything else | A real tap on a hand card with the overlay ticks, and picking and playing still work. If it doesn't tick, vibration is dropped. |
| The `Feedback` module | T1 | A new `feedback` area in `selftest.js`: cue ranks, seat filters, gates, dropping with a fake clock, and ticks with a stubbed `navigator.vibrate` and `AudioContext` |
| The overlay | T1 | `forced.js` (plays through the hand's controls): picking and playing a card with the overlay on behave as with it off |
| The Settings rows | T1 | `settings.js` |
| Runtime caching of `sounds/` in `sw.js`, then the `SOUNDS` precache | T1 | `sw.js`, including an install where one sound fails to load |
| Missing files are silent | T1 | The `feedback` area: a failed fetch and a failed decode drop the cue and show nothing |
| Reset this tab | T1 | `resets.js` |
| On an Android phone | By hand, once | The tick, and whether sound adds any delay at Fast |

The new section's banner gets a `Tests:` line, and `CLAUDE.md` and `tests/README.md` list the new area.

## Decisions

| # | Question | Decision |
|---|---|---|
| 1 | One switch or two | Two: Vibration and Sound |
| 2 | Volume | Sound is Off, Half or Full, in place of a switch |
| 3 | Your-turn cue | None |
| 4 | Vibration for a won hand | None (no game moment vibrates, see 18) |
| 5 | Vibration while you mediate | None (see 18) |
| 6 | A bot's King point | Sound only, distinct from yours |
| 7 | Sound in the replay viewer | A separate **Sound in replays** switch, off by default |
| 8 | Your seat under autoplay | The same sounds as when you play it, and no ticks |
| 9 | Wave cleared | Its own sound |
| 10 | Picking a card | A tick, no sound |
| 11 | Pass, void, refused move, buttons | No sound |
| 12 | Reset this tab | Sets Sound and touch back to Off |
| 13 | Sound source | Recorded WAV files, supplied separately |
| 14 | Where the files live | External files in `sounds/`. The interface is silent when one is missing. |
| 15 | Speed Instant | Turns off vibration, sound and parallax, with no override |
| 16 | Offline sounds | Runtime caching until the full set exists, then precached at install |
| 17 | When sounds load | When the browser is idle after page load, while Sound isn't Off. Nothing waits for them. |
| 18 | Platform parity | The iPhone is the ceiling: one tick at a real tap, on both platforms. No game moment vibrates. |
| 19 | Which taps tick | Picking, unpicking and playing a card in your hand |
| 20 | The iPhone route | An invisible switch over each hand card, unverified until a real iPhone test passes |
