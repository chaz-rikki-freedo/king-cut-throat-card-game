# Feedback: vibration and sound

> **Status: draft.** Planning for [#184 Haptics](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/184) and [#183 Sound effects](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/183). The game sends moments to an optional, external feedback module (see [Architecture](#architecture)). Items marked **Open** are still to be decided. Nothing is built yet.

*Feedback* is what the game does besides drawing the table: a short vibration or a short sound at a game moment. This page defines the cues, when each one plays, when nothing plays, and what is dropped when cues collide. Vibration and sound read the same cue table, so they never disagree about what happened.

Moment names come from [Game moments](moments.md). Area and part names come from [Vocabulary](vocabulary.md).

## Principles

1. **Feedback is a bonus.** The game never depends on it. Safari on iOS has no vibration, and a phone can be on silent. Every cue repeats something the table already shows.
2. **Keep it rare.** A cue that plays all the time becomes noise. Vibration is kept for moments that matter to you. Sound can mark more moments, but quietly.
3. **Follow the screen.** A cue plays when the player *sees* the moment, not when the Engine applies it.
4. **Drop, never wait.** A cue that can't play on time is dropped. Nothing is queued for later.
5. **Instant turns it all off.** At speed Instant, no vibration, sound or parallax plays (parallax: [#185](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/185)). No setting overrides this, including **Sound in replays**.
6. **The module is optional.** The game announces moments whether or not anything listens. Without the feedback module, the game is silent and still, and nothing says so.

## Architecture

The game and the feedback module are separate. The game says **what happened and when the player sees it**. The module decides **what to do about it**.

```
index.html (the game)                       feedback/ (optional)
─────────────────────                       ────────────────────
act(), holdResult(), showGameOver,          feedback.js
the hand's card handler                       listens for 'kct:moment'
   │                                          picks one cue per batch
   └─ a batch of moments ── CustomEvent ──►   applies its gates and dropping
      at screen time                          vibrates (Android), plays a sound
                                              from feedback/sounds/*.wav

   No listener: the event goes nowhere. No error, no wait.
```

### Files

| Path | Holds |
|---|---|
| `index.html` | The game. A small `Moments` section builds and sends moments, and loads the module. |
| `feedback/feedback.js` | The feedback module: cues, moments of interest, gates, dropping, settings rows, sound loading. |
| `feedback/sounds/*.wav` | The sound files (see [Sound files](#sound-files)). |

### Sending

- The game sends one `CustomEvent` on `document`, named `kct:moment`, for each **batch**: the moments of one action that the player sees at the same time.
- A batch is sent at its screen time, from the anchor's call site (see [Order of operations](#order-of-operations)). The module never schedules a moment itself.
- Sending costs microseconds and works the same with or without a listener.

```js
document.dispatchEvent(new CustomEvent('kct:moment', { detail: {
  v: 1,                    // the contract version
  version: 1834,           // the game state version, for stale checks
  at: performance.now(),   // when the batch was sent
  anchor: 'sweep',         // 'land', 'sweep', 'result', 'gameOver' or 'tap'
  replay: false,           // true in the replay viewer
  moments: [
    { type: 'trickWon', seat: 0, you: true, card: 'KS', trump: 'S', trickNumber: 4, totalTricks: 7, showdown: false },
    { type: 'king', seat: 0, you: true, card: 'KS', showdown: false, scoresBefore: [5, 6, 3], scoresAfter: [6, 6, 3] }
  ]
} }));
```

### Control messages

Sent on the same event, with `moments` empty and a `control` field:

| `control` | When the game sends it | What the module does |
|---|---|---|
| `cancel` | A new state version, **Next hand**, Exit, a new game, a jump in the replay viewer. `scope: 'game'` for a new game, a resume or a jump; `scope: 'step'` otherwise. | Clears armed cues and stops sounds not yet started. With `scope: 'game'`, also clears its memory. |
| `reset` | **Reset this tab** in Settings → Table | Sets its settings back to Off |
| `speed` | The speed changes, with `speed: 'instant'` or another value | Removes or restores its settings' effect, for principle 5 |

### The moments

The game's side of the contract. Every moment carries `type`, and `seat` and `you` where a seat is involved. **All facts are public**: the game builds them from the View for your seat, never from the full game state.

| `type` | Anchor | Engine source | Facts |
|---|---|---|---|
| `deal` | `land` | `DEAL`, `SHOWDOWN_DEAL` | `showdown` |
| `flip` | `land` | The kitty card turned up | `card` |
| `discard` | `land` | `DISCARD`, `EXCHANGE_DISCARD`, `SHOWDOWN_DISCARD` | `seat`, `you`, `count` |
| `trumpNamed` | `land` | An accept or a named suit | `seat`, `you`, `trump`, `round` |
| `cardPlayed` | `land` | `CARD_PLAYED` | `seat`, `you`, `card`, `showdown` |
| `trickWon` | `sweep` | `TRICK_WON`, `SHOWDOWN_TRICK_WON` | `seat`, `you`, `card`, `trump`, `trickNumber`, `totalTricks`, `showdown` |
| `king` | `sweep` | `KING_SCORED` | `seat`, `you`, `card`, `showdown`, `scoresBefore`, `scoresAfter` |
| `handScored` | `result` | `HAND_SCORED` | `winner`, `you`, `outcome`, `scoresBefore`, `scoresAfter` |
| `showdownCalled` | `result` | `SHOWDOWN_STARTED` | `players`, `mediator`, `youPlay`, `youMediate` |
| `showdownScored` | `result` | `SHOWDOWN_SCORED` | `winner`, `loser`, `you`, `youMediate`, `tricks`, `scoresBefore`, `scoresAfter` |
| `gameEnded` | `gameOver` | `GAME_ENDED` | `winner`, `you`, `scores`, `mode`, `byKing` (derived) |
| `waveCleared` | `gameOver` | The wave line of the game-over dialog | `wave`, `finalWave` (derived) |
| `cardPicked` | `tap` | Your tap on a card in your hand, for a discard | `card`, `picked` |
| `skipPressed` | `tap` | Your tap on **Skip ▶** | `youMediate` |

Derived facts for the [moments of interest](#moments-of-interest), such as `maxDeficit` and `kingsThisGame`, are added to these moments as each one is settled.

### Open-ended types

The table above is the starting vocabulary, not a closed set.

- **The module ignores any type it doesn't know**, and any field it doesn't use. The game can start sending a new type, or a new fact on an existing type, without breaking an older module.
- **`v` changes only when an existing moment changes shape:** a field renamed, removed or given a new meaning. Adding a type or a field leaves `v` as it is.
- Every new type follows the same rules: public facts only, sent at its screen time, and listed in this table.

### Derived events

The module can create its own events from the moments it receives: a *derived event*. It watches the stream for a pattern, such as a streak or a sequence, and when the pattern completes, it adds a derived event to the current batch.

- A derived event goes through the same rule table as any moment. It can have its own cue, and it outranks the ordinary cue for that batch.
- Derived events use the `derived:` prefix, such as `derived:trickStreak`, so they never collide with a type the game sends.
- A derived event never spawns another derived event. Only moments from the game are watched, so there are no chains or loops.

**The module's memory.** To see patterns, the module keeps a short memory of the moments it received:

- **Only moments.** It records nothing but the batches the game sent. Every moment is public, so the memory can't reveal a card someone holds unseen.
- **Short.** It keeps the moments of the current game only, capped at `MEMORY_MAX` moments.
- **Cleared** on a new game, on a resume or reload (a restored game sends no history), and on a jump in the replay viewer. The game's `cancel` message carries a `scope` of `game` or `step` to say which.
- **Skips are gaps.** Moments that the game doesn't send (at Instant, during a skip) are simply missing, so a pattern that spans them doesn't complete. That is the safe result.

**Derived events and the moments the game derives.** Facts that need game knowledge, such as `byKing`, still come from the game. A derived event only combines moments the module has already seen: streaks, sequences and combinations over time.

### Other listeners

`kct:moment` isn't only for sound and vibration. Any optional module can listen, and each one ignores what it doesn't use. Parallax ([#185](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/185)) can react to the same moments, and to the same derived events if they come from a shared rule table, so a moment of interest can combine a sound, a vibration and a parallax motion. **Open:** whether parallax lives in `feedback/` and shares its rule table, or listens on its own.

### Who owns what

| The game (`index.html`) | The module (`feedback/feedback.js`) |
|---|---|
| The moments and their facts | The [cues](#cues), ranks, vibration patterns and sound files |
| Screen time: when each batch is sent | The [moments of interest](#moments-of-interest) rule table |
| Not sending at all: at Instant, during a skip, on a resume, during a viewer jump, while the menu or a question is open, and while another tab is more current | Its own [gates](#gates): its settings, device support, the first tap, a hidden tab, `replay` with **Sound in replays** off |
| `cancel`, `reset` and `speed` messages | [Dropping](#dropping) |
| An empty, hidden **Sound and touch** card in Settings → Table | The card's rows, its device keys and its sound loading |

### Loading the module

1. When the browser is idle after page load (`requestIdleCallback`, or a short `setTimeout` where it's missing), the game adds `<script src="feedback/feedback.js">`.
2. It is a classic script, not a module import: a local copy opened from `file://` blocks module imports.
3. If the file is missing, the script fails to load and nothing else happens. The browser may still list the failed request in its developer tools; the page can't prevent that, and players never see it.
4. The module announces itself with `kct:feedback-ready`, which carries its contract version (`v`). The game then shows the **Sound and touch** card, and the module fills it in.
5. If the module's `v` doesn't match the game's, the module ignores every batch and leaves the card hidden. A mismatched pair is silent, never wrong.

### Settings in two files

- The game's Settings markup has an empty card, `#setFeedback`, under the heading **Sound and touch**, hidden by default.
- The module adds the rows from [Settings](#settings) to it and handles them. It keeps its device keys itself.
- Without the module, the heading and card stay hidden, so Settings never offers a choice that does nothing.

## Channels

| Channel | API | Supported on | Default | Notes |
|---|---|---|---|---|
| Vibration | `navigator.vibrate(pattern)` | Chrome on Android, including the installed app | Off | A new call replaces the pattern still running. Not supported on iOS. |
| Sound | Web Audio (`AudioContext`) | All supported browsers | Off | Recorded WAV files in `feedback/sounds/` (see [Sound files](#sound-files)). Each is loaded and decoded once, when the browser is idle after page load. Sound plays only after the first tap. Never use `<audio>` elements. |

## Settings

The rows are in **Settings → Table**, under a new heading, **Sound and touch**. The module adds them when it loads (see [Settings in two files](#settings-in-two-files)).

| Row | Control | Shown when | Default | Description text (draft) |
|---|---|---|---|---|
| **Vibration** | Switch | `navigator.vibrate` exists | Off | Short vibrations when you win a trick or a King point, pick a card, and at the end of a game. |
| **Sound** | Off, Half, Full | Always | Off | Short sounds for cards, tricks and results. Half plays them at half volume. |
| **Sound in replays** | Switch | Sound isn't Off | Off | The replay viewer plays the same sounds, at the Sound level. |

- Vibration and Sound are separate, so you can have either without the other.
- The device volume sets the overall level. Half and Full scale it inside the game.
- All three are kept on the device only: one `localStorage` key each, read inside `try`, the same way as the Awards switch. They are not part of `saveSettings()`, a game save or a backup.
- **Reset this tab** sets all three back to Off, through the `reset` message. Its description text names Sound and touch only while the module is loaded.

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

The module picks **one cue per batch**: the highest-ranked cue among the batch's moments. A moment of interest outranks the ordinary cue for the same moment.

- **No your-turn cue.** The table already shows whose turn it is.
- **A game that ends mid-trick** (a King point reaches 10) plays only `gameWin` or `gameLoss`, never `king` and `trickWon` as well.
- **A Showdown hand.** `showdownCalled` replaces `handResult`, because both come from the same action.
- **The Mediator.** While you mediate, only two things vibrate:
  - **The Showdown ends:** `showdownResult` with its `[60, 40, 60]` pattern, whether the Showdown played out or you skipped it.
  - **You press Skip ▶:** a short `[20]` tap.

  `showdownCalled` and the Showdown's trick and King cues don't vibrate for the Mediator. All the sounds still play, except during the skip.
- **Autoplay.** Your seat's cues play as if you played it yourself, vibration included.
- **Events that never cue:** `GAME_STARTED`, `TRICK_STARTED`, `BIDDING_ROUND`, `DISCARDS_COMPLETE`, `KITTY_TRANSFER` and `SCORE_CHANGED`. Each comes with another event that already cues.
- **No sound** for a pass (`BID_PASS`), Hand void, Hand abandoned, a refused move, or any button, including Next hand, Deal the Showdown and Skip ▶.

### Taps

| Tap | Vibration | Sound |
|---|---|---|
| A card picked or unpicked | `[8]`, under the Vibration switch | None |
| Skip ▶, while you mediate | `[20]`, under the Vibration switch | None |
| Other buttons, the menu, Settings | None | None |

## Moments of interest

A *moment of interest* is a rare situation that gets its own cue: a sound, a vibration pattern, or both. It **replaces** the ordinary cue for that moment, never adds to it. This list is a collection of candidates. Each needs a settled definition before it is built.

The rule table lives in the module. Adding a moment of interest changes only `feedback/`, unless it needs a fact the game doesn't send yet.

### Rules

1. **Public facts only.** A moment carries only what your seat can see, built from the View, never from the full game state. No cue may reveal a card someone holds unseen.
2. **The game derives what needs game knowledge.** Facts such as "the game ended on a King point" or "a 5–0 Showdown" are worked out by the game and sent with the moment. The module never reads the game. It only remembers the moments it received, for [derived events](#derived-events).
3. **The most specific match wins.** A moment of interest ranks above the ordinary cue for the same moment, and the [dropping](#dropping) rules still apply.
4. **Keep them rare.** A moment of interest that fires every game stops being special. Measure how often each one fires across many simulated games before giving it a cue.
5. **Replays match.** Moments come from the Engine's events, so the replay viewer, with **Sound in replays** on, plays the same moments of interest as the live game.
6. **Speed Instant turns them off** like every other cue (principle 5).

### Scoring facts

Every moment that changes a score carries `scoresBefore` and `scoresAfter`, with all three seats. Then a definition such as "lead change" lives in `Feedback`, and refining it later needs no change to the game.

### Candidates

| Moment | Replaces | Facts needed | Definition | Status |
|---|---|---|---|---|
| **A King point changes the lead** | `king` | `seat`, `you`, `showdown`, `scoresBefore`, `scoresAfter` | **Open**, see [Lead change](#lead-change). Two cues: you take the lead, or a bot takes it from you. | Candidate |
| You win the game on a King point | `gameWin` | `you`, `byKing` (derived) | The King point that takes you to 10 | Candidate |
| Your Joker wins a trick | `trickWon` or `king` | `you`, `card` | Your winning card is the Joker | Candidate |
| You take the last trick of the hand | `trickWon` | `you`, `trickNumber`, `totalTricks` | `trickNumber === totalTricks` in the main hand | Candidate |
| A Showdown won 5–0 | `showdownResult` | `tricks` per Showdown player | One player takes all 5 Showdown tricks | Candidate |
| A comeback win | `gameWin` | `you`, `maxDeficit` (derived) | You win after trailing the leader by **Open** points or more | Candidate |
| Your first King point of the game | `king` | `you`, `kingsThisGame` (derived) | Your King point count goes from 0 to 1 | Candidate |
| You clear the final wave | `waveCleared` | `mode`, `wave`, `finalWave` (derived) | Clearing the last wave of the Waves table | Candidate |
| `derived:trickStreak` | `trickWon` | The module's memory of `trickWon` | You win **Open** (3?) tricks in a row, across hands | Candidate, derived |
| `derived:perfectHand` | `handResult` | The module's memory of `trickWon` in the hand | You win every main trick of a hand | Candidate, derived |
| `derived:kingThenLead` | `king` | The `king` moment and the scores before it | A King point that also changes the lead, see [Lead change](#lead-change) | Candidate, derived |
| `derived:pressure` | `king` or `handResult` | `scoresAfter` over the game | A bot reaches 9 while you're behind, the first time this game | Candidate, derived |
| `derived:revenge` | `showdownResult` | The module's memory of `showdownScored` | You win a Showdown against the seat that won the previous one | Candidate, derived |

### Lead change

The leaders are every seat with the top score. Settle these cases before building the lead-change cue:

| Case | Example (You, West, East) | Counts? |
|---|---|---|
| You go from behind into sole first place | `5, 6, 3` → `7, 6, 3` | Yes |
| You go from behind to a tie for first | `5, 6, 3` → `6, 6, 3` | **Open** |
| You go from a tie for first into sole first place | `6, 6, 3` → `7, 6, 3` | **Open** |
| A bot passes you | `6, 5, 3` → `6, 7, 3` | Yes, as "a bot takes the lead from you" |
| One bot passes the other while you're behind | `3, 6, 5` → `3, 6, 7` | **Open**, probably no |
| The King point takes a seat to 10 | `9, 8, 3` → `10, 8, 3` | No: the game-end cue outranks it |
| A Showdown King point | Any of the above, in a Showdown | **Open** |
| A hand result changes the lead | Any of the above, at the hand result | **Open**: a separate moment of interest, replacing `handResult` |

### Adding a moment of interest

1. Add a row to **Candidates** with the facts it needs and a precise definition.
2. Decide where it comes from:
   - **From one moment:** a rule in the module's table.
   - **From a pattern over time:** a derived event in the module.
   - **From game knowledge the moments don't carry:** a new fact the game sends. Public only.
3. Measure how often it fires.
4. Give it a cue: a sound file in [Sound files](#sound-files), a vibration pattern, or both.

## Gates

No cue plays when any of these is true. **Game** gates mean the game sends no batch. **Module** gates mean the module drops what it receives.

| Condition | Owner | Checked with | Notes |
|---|---|---|---|
| Speed is **Instant** | Game | `app.ui.speed` | Applies to both channels and to parallax (#185), in live games and the replay viewer. No setting overrides it. |
| Skip ▶ is running | Game | `skipping()` | The `showdownScored` batch is still sent when the skip ends. Skipping isn't speed Instant, so principle 5 doesn't silence it. If the result comes within `GAP_VIBRATE_MS` of the Skip ▶ tap, the result's pattern replaces the tap. |
| A game is resumed or reloaded | Game | `resume` | A restored game never sends a past moment. |
| A jump or single step in the replay viewer | Game | `watchTick` | |
| The menu or a question is open | Game | `app.menuOpen`, `askDone` | The game waits, so no moments happen. |
| Another tab is more current | Game | `TabLock.stale` | |
| The channel's setting is off | Module | Its `localStorage` key | Sound: the level is Off. |
| The channel isn't supported | Module | `typeof navigator.vibrate`, `window.AudioContext` | |
| No tap yet on this page load | Module | `navigator.userActivation.hasBeenActive` | Browsers block both channels until then. If the property is missing, the channel stays quiet. |
| The replay viewer | Module | The batch's `replay` | No vibration. Sound plays only with **Sound in replays** on. |
| The tab is hidden | Module | `document.hidden` | |

The system's reduced-motion setting turns off the motion, so screen time is the same as engine time and cues play at once. Reduced motion does not turn feedback off.

## Dropping

Each cue carries its batch's `at` time. When it is due, it goes through these checks in order:

1. **Stale.** The state version changed, the tab is hidden or another tab is more current. Drop it.
2. **Not ready.** Its sound is missing, failed to load or isn't decoded yet. Drop the sound. Vibration still plays.
3. **Late.** More than `LATE_MS` past its moment. Drop it.
4. **Too soon.** Less than the channel's minimum gap since its last cue. Drop it, unless it ranks higher, in which case it replaces the last cue.
5. **Too many sounds.** `MAX_VOICES` sounds are already playing. Drop it.
6. Otherwise, play it once. Nothing is kept for a retry.

The game's `cancel` message (a new action, **Next hand**, Exit, a new game or a jump in the replay viewer) cancels every armed cue.

| Constant | Draft value | Meaning |
|---|---|---|
| `LATE_MS` | 80 | How late a cue may be and still play. |
| `GAP_VIBRATE_MS` | 150 | The minimum time between two vibrations. A card pick ignores this gap. |
| `GAP_SOUND_MS` | 60 | The minimum time between two sounds. |
| `MAX_VOICES` | 4 | The most sounds that play at once. |
| `HALF_GAIN` | 0.5 | The volume for Half. |
| `MEMORY_MAX` | 1000 | The most moments the module remembers, for [derived events](#derived-events). A hand sends about 35 moments; check the value against the longest games in `gamelength.js` before building. |

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

- Mono, 16-bit PCM, 22,050 Hz. A sound effect needs nothing more, and it keeps the download small.
- No silence at the start, so the sound lines up with the moment. Trim the tail to where it fades out.
- Peaks at about −3 dBFS. Keep the levels matched, so no sound jumps out at Full.
- Size: one second at this format is about 44 KB. The 17 required files at the lengths above come to roughly 0.5 to 0.7 MB.

### Where the files live

- The files are in `feedback/sounds/`, and `tools/publish.sh` adds `feedback` to the files it publishes.
- **Missing files are silent.** A file that is missing or fails to load or decode is dropped: no notice, no toast and no Settings text. The game plays as if that cue had no sound. The Sound row still shows. This covers a set of files that isn't complete yet. A local copy with only `index.html` has no module at all, so it is silent anyway.
- Nothing is written to the console for a missing file, so a local copy stays clean. The Event log, when on, records one `SOUND_MISSING` line for each file, once a page load.
- **Offline, in two steps.**
  1. **Until all 17 files exist:** the service worker caches each sound the first time it loads (runtime caching). An installed app that has played a sound once has it offline.
  2. **Once all 17 required files are in `feedback/sounds/`:** the service worker precaches them at install, from a `SOUNDS` list in `sw.js`, so every sound works offline from the start.
- `feedback/feedback.js` follows the same two steps: runtime caching first, then precached with the sounds, and never part of `ASSETS`.
- **Feedback never breaks the install.** Precaching fetches each file in `feedback/` on its own, apart from `ASSETS`. A file that fails to load is skipped and left to runtime caching, so the page, the manifest and the icons still install.
- A file that changes is picked up by the service worker's update check, the same as the icons.

## Performance

- Sending a batch costs microseconds. With no module loaded, it costs the same.
- The module loads when the browser is idle, so it never delays the page or the first table.
- Vibration costs microseconds on the main thread. The device does the vibrating.
- Sound plays on the audio thread. A busy main thread can only delay when a sound starts, and `LATE_MS` drops a sound that starts too late.
- The sounds load only while Sound isn't Off, when the browser is idle, one at a time, never during a game moment. Decoding uses an `OfflineAudioContext`, so it needs no tap.
- The playing `AudioContext` is created or resumed on the first tap.
- Nothing in the interface waits for the sounds. A sound that isn't loaded is dropped.
- A file that fails to load is not fetched again on that page load.
- Sounds are scheduled on `audioContext.currentTime`, not on extra `setTimeout`s.

## Order of operations

From page load to a cue playing, in order. Each step names who does it.

### 1. Page load

1. **Game:** draws the page. The **Sound and touch** card stays hidden.
2. **Game:** when the browser is idle, adds `<script src="feedback/feedback.js">` (see [Loading the module](#loading-the-module)).
3. **Module:** reads its three device keys: Vibration, Sound and Sound in replays. It adds `kct:moment` and first-tap listeners, then sends `kct:feedback-ready`.
4. **Game:** on `kct:feedback-ready` with a matching `v`, shows the card. The module fills in its rows.
5. Buttons and the table never wait for any of this.

### 2. Loading the sounds

1. **Module:** right after it loads, and only if Sound isn't Off, it starts loading the sounds.
2. It loads them **one at a time**: download from `feedback/sounds/`, then decode with an `OfflineAudioContext`. Decoding needs no tap and logs no warning. A decoded sound plays in any audio context.
3. A file that fails to download or decode is marked missing: nothing on screen, nothing in the console, and one `SOUND_MISSING` line in the Event log when it's on. It isn't tried again on that page load.
4. **When Sound changes from Off to Half or Full,** loading starts then, if it hasn't already.
5. Vibration needs no loading.

Once the service worker has cached the files, they load from the device in a few milliseconds, so they are almost always ready before the first cue. A sound that isn't ready is dropped (see [Dropping](#dropping)).

### 3. The first tap

1. **Module:** a one-time `pointerdown` listener runs on the first tap anywhere on the page.
2. If Sound isn't Off, it creates or resumes the playing `AudioContext`. A change of the Sound setting is itself a tap, so it does the same.

### 4. Each action, in `act()` (game)

1. `Engine.dispatch` applies the action and returns its events.
2. The existing work runs: `narrate`, `draw` and `schedule`.
3. `Moments.build(events, view)` turns the events into moments. It is a pure function: it ignores events that never become moments, reads only the View for your seat, and adds derived facts.
4. The game's [gates](#gates) run. If one fails, nothing is sent.
5. The moments are grouped by anchor, and each group is sent as a batch at its screen time:

   | Anchor | Where the batch is sent |
   |---|---|
   | `land` | `act()`, one motion step (`Fx.step()`) later |
   | `sweep` | Held from `TRICK_WON`, and sent in the next `act()`, the one that leaves Trick end, when the sweep is drawn |
   | `result` | The release in `holdResult()` |
   | `gameOver` | `showGameOver` |
   | `tap` | At once, in the tap's handler |

### 5. When a batch arrives (module)

1. The module's [gates](#gates) run. A batch that fails one is dropped.
2. Unknown types and fields are ignored. The batch is added to the module's memory, and any pattern it completes adds a derived event to the batch.
3. The rule table picks one cue for the batch: the highest-ranked match, moments of interest and derived events first.
4. The [dropping](#dropping) checks run in order: stale, not ready, late, too soon, too many sounds.
5. A cue that passes plays once:
   - **Vibration:** `navigator.vibrate(pattern)`.
   - **Sound:** a buffer source, through a gain node (Half or Full), started on `audioContext.currentTime`.
6. The channel records the time and rank, for the next gap check.

### 6. Taps

1. **A card picked or unpicked:** the game sends a `tap` batch with `cardPicked`. The module checks the Vibration switch and support, then vibrates `[8]`. No gap check and no sound.
2. **Skip ▶ while you mediate:** the game sends a `tap` batch with `skipPressed`. The module vibrates `[20]`. A Showdown result within `GAP_VIBRATE_MS` replaces it.

### 7. Cancelling

The module clears every armed cue and stops any sound scheduled but not yet started. It does this on the game's `cancel` message (a new state version, **Next hand**, Exit, a new game, a jump in the replay viewer) and when the tab is hidden. Nothing is kept for later.

A `cancel` with `scope: 'game'` (a new game, a resume, a jump in the replay viewer) also clears the module's memory.

### 8. Settings changes

| Change | What happens |
|---|---|
| Sound to Off | The module cancels, then the playing `AudioContext` is suspended. Loaded sounds stay in memory for the page load. |
| Sound from Off to Half or Full | Loading starts if it hasn't, and the playing `AudioContext` is created or resumed. |
| Vibration off | `navigator.vibrate(0)` stops a pattern that is running. |
| Reset this tab | The game sends `reset`. The module sets all three to Off, with the effects above. |
| Speed to Instant, or back | The game sends `speed`. At Instant, the module cancels and stops a running pattern. |

## Code

### In `index.html`

- A new section, `Moments`, after section 7b (`Fx`), with its own banner and `Tests:` line.
- `Moments.build(events, view)`: a pure function from an action's events and the View for your seat to moments. The self-test covers it.
- `Moments.send(anchor, moments)` and `Moments.control(name, data)`: send a batch or a control message.
- `Moments.load()`: adds the module's script when the browser is idle.
- Call sites: `act()` after `narrate`, the release in `holdResult()`, `showGameOver`, the hand's card handler, Skip ▶, the speed picker, **Reset this tab**, and every place that cancels.
- Settings markup: the hidden **Sound and touch** heading and the empty `#setFeedback` card.

### In `feedback/feedback.js`

- One file, no build step, no dependencies. It reads nothing from the game except batches and control messages.
- The cue table, the moments-of-interest rule table, the derived-event patterns, the vibration patterns, the sound table, the dropping limits and `MEMORY_MAX` are named constants.
- `derive(memory, batch)`: a pure function from the memory and a new batch to the derived events it completes. Its tests feed it sequences of batches.
- `cueFor(batch)`: a pure function from a batch to at most one cue for each channel. Its tests feed it batches.
- It checks the [gates](#gates) it owns, applies the dropping rules, and plays.
- It builds and handles the rows in `#setFeedback`, and keeps its own device keys.

### Elsewhere

- `sw.js`: runtime caching for `feedback/`, then a precache list once the full set of sounds exists.
- `tools/publish.sh`: `feedback` in its file list.
- `README.md`: describes `feedback/` as an optional add-on to the one-file game.

## Tests

| Change | Tier | Scripts |
|---|---|---|
| `Moments` in `index.html` | T1 | A new `moments` area in `selftest.js`: each Engine event gives the right moments and anchors; no moment carries a fact the View doesn't show; the game gates send nothing |
| `feedback/feedback.js` | T1 | A new `tests/feedback.js` script: cue ranks, moments of interest, seat rules, module gates, and dropping with a fake clock and stubbed `navigator.vibrate` and `AudioContext`. `typecheck.js` checks the file too. |
| The contract | T1 | `tests/feedback.js`: the moment types and fields match between the two files, a `v` mismatch keeps the module silent, and an unknown type or field is ignored |
| Derived events | T1 | `tests/feedback.js`: each pattern completes on the right sequence and not on a near miss; a gap (a skip) breaks it; the memory clears on `cancel` with `scope: 'game'`; a derived event never spawns another |
| The Settings card | T1 | `settings.js`: hidden without the module, filled in with it |
| Runtime caching of `feedback/` in `sw.js`, then the precache | T1 | `sw.js`, including an install where one feedback file fails to load |
| Missing files are silent | T1 | `tests/feedback.js`: a failed fetch and a failed decode drop the cue, show nothing and leave vibration playing |
| Reset this tab | T1 | `resets.js` |
| On a phone | By hand, once | Vibration patterns on Android, and whether sound adds any delay at Fast |

The `Moments` banner gets a `Tests:` line, and `CLAUDE.md` and `tests/README.md` list the new area and script.

## Decisions

| # | Question | Decision |
|---|---|---|
| 1 | One switch or two | Two: Vibration and Sound |
| 2 | Volume | Sound is Off, Half or Full, in place of a switch |
| 3 | Your-turn cue | None |
| 4 | Vibration for a won hand | None |
| 5 | Vibration while you mediate | Only the Showdown's end and pressing Skip ▶ |
| 6 | A bot's King point | Sound only, distinct from yours |
| 7 | Sound in the replay viewer | A separate **Sound in replays** switch, off by default |
| 8 | Your seat under autoplay | The same cues as when you play it |
| 9 | Wave cleared | Its own vibration and sound |
| 10 | Picking a card | Vibration only, under the Vibration switch |
| 11 | Pass, void, refused move, buttons | No sound |
| 12 | Reset this tab | Sets Sound and touch back to Off |
| 13 | Sound source | Recorded WAV files, supplied separately |
| 14 | Where the files live | External files in `feedback/sounds/`. The interface is silent when one is missing. |
| 15 | Speed Instant | Turns off vibration, sound and parallax, with no override |
| 16 | Offline sounds | Runtime caching until the full set exists, then precached at install |
| 17 | When sounds load | When the browser is idle after page load, while Sound isn't Off. Nothing waits for them. |
| 18 | Platforms for vibration | Android only, with full patterns. iPhone gets no vibration: no overlays or other workarounds. The Vibration row is hidden where `navigator.vibrate` doesn't exist. |
| 19 | Architecture | An optional, external module in `feedback/`. The game sends moments and never depends on a reply. |
| 20 | Sending | A `kct:moment` `CustomEvent` on `document`, one batch per anchor, at screen time |
| 21 | Loading | A classic script added when the browser is idle. A missing file is silent. |
| 22 | Settings | The game keeps an empty, hidden card. The module fills it in once it loads. |
| 23 | Contract version | `v` on every batch and on `kct:feedback-ready`. A mismatch keeps the module silent. |
| 24 | Open-ended types | The module ignores unknown types and fields. Adding either leaves `v` unchanged. |
| 25 | Derived events | The module may create `derived:` events from patterns in the moments it received, kept in a short, public-only memory of the current game |
