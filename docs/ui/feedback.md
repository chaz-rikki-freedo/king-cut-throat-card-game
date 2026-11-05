# Feedback: vibration and sound

> **Status: draft.** Planning for [#184 Haptics](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/184) and [#183 Sound effects](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/183). The game sends moments to an optional, external feedback module (see [Architecture](#architecture)). Items marked **Open** are still to be decided. Nothing is built yet.

*Feedback* is what the game does besides drawing the table: a short vibration or a short sound at a game moment. This page defines the cues, when each one plays, when nothing plays, and what is dropped when cues collide. Every channel reads the same rule table, so they never disagree about what happened.

Moment names come from [Game moments](moments.md). Area and part names come from [Vocabulary](vocabulary.md).

## Principles

1. **Feedback is a bonus.** The game never depends on it. Safari on iOS has no vibration, and a phone can be on silent. Every cue repeats something the table already shows.
2. **Keep it rare.** A cue that plays all the time becomes noise. Vibration is kept for moments that matter to you. Sound can mark more moments, but quietly.
3. **Follow the screen.** A cue plays when the player *sees* the moment, not when the Engine applies it.
4. **Drop, never wait.** A cue that can't play on time is dropped. Nothing is queued for later.
5. **Instant turns it all off.** At speed Instant, no vibration, sound or parallax plays, event or common (parallax: [#185](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/185)). No setting overrides this, including **Sound in replays**.
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
| `trickWon` | `sweep` | `TRICK_WON`, `SHOWDOWN_TRICK_WON` | `seat`, `you`, `card`, `trump`, `trickNumber`, `totalTricks`, `showdown`, `tricksWon` (each seat's count after this trick, as the circles show), `caller` |
| `king` | `sweep` | `KING_SCORED` | `seat`, `you`, `card`, `showdown`, `scoresBefore`, `scoresAfter` |
| `handScored` | `result` | `HAND_SCORED` | `winner`, `you`, `outcome`, `points`, `caller`, `tricks`, `scoresBefore`, `scoresAfter` |
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

### Parallax: event and common

Parallax ([#185](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/185)) comes in two kinds, kept apart by name:

| Kind | What it is | Where it lives | Driven by |
|---|---|---|---|
| **Event parallax** | A short parallax motion at a game moment, such as a lift of the table on a King point that changes the lead | `feedback/`, as a third channel beside vibration and sound | The feedback rule table: the same moments, moments of interest and derived events. One cue can carry a sound, a vibration and an event parallax motion. |
| **Common parallax** | Ambient parallax unrelated to game moments, such as depth in the menu or the felt | Outside `feedback/`, as its own code under #185 | Its own inputs. It never reads `kct:moment` or the rule table. |

- **Event parallax follows the feedback rules:** the [gates](#gates), the [dropping](#dropping) rules, one cue per batch, and silence when the module is missing.
- **Common parallax works without the module.** Removing `feedback/` stops event parallax only.
- **Both stop at speed Instant** (principle 5), and both respect the system's reduced-motion setting.
- The motions, their settings and their interaction with `Fx` belong to #185's spec. This spec defines only that event parallax is a channel of the feedback module.

### Other listeners

`kct:moment` is open to any optional listener, and each one ignores what it doesn't use. A listener outside `feedback/` doesn't share the rule table, so it can't take part in a combined cue.

### Who owns what

| The game (`index.html`) | The module (`feedback/feedback.js`) |
|---|---|
| The moments and their facts | The [cues](#cues), ranks, vibration patterns and sound files |
| Screen time: when each batch is sent | The [rule table and cue table](#cues), including the [moments of interest](#moments-of-interest) |
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
| Event parallax | Defined in #185 | Defined in #185 | Defined in #185 | Driven by the rule table, see [Parallax: event and common](#parallax-event-and-common). |
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

Cues are defined in two tables, both named constants in the module:

- The **rule table** says *when*: which cue a batch gets. It is the same for every channel.
- The **cue table** says *what*: what each channel does for that cue. A channel left empty does nothing for it.

A new moment of interest is a rule row, plus a cue row if it needs a cue of its own. A channel's response to a moment changes only the cue table, never the rules.

### Rule table

The module tries the rules in rank order, and the **first match wins**: a lower number is tried first. Moments of interest and derived events go above the ordinary rule for the same moment. **You** means your seat, including while the AI plays it (autoplay).

| Rank | Matches | Cue | Batch anchor |
|---|---|---|---|
| 1 | `waveCleared` | `waveCleared` | `gameOver` |
| 2 | `gameEnded`, you won | `gameWin` | `gameOver` |
| 2 | `gameEnded`, a bot won | `gameLoss` | `gameOver` |
| 3 | `showdownCalled`, you play in it | `showdownCalledYou` | `result` |
| 3 | `showdownCalled`, you mediate or sit out | `showdownCalledOther` | `result` |
| 4 | `showdownScored`, you won | `showdownWin` | `result` |
| 4 | `showdownScored`, you lost | `showdownLoss` | `result` |
| 4 | `showdownScored`, you mediate | `showdownMediated` | `result` |
| 5 | `handScored`, you won | `handWin` | `result` |
| 5 | `handScored`, a bot won | `handLoss` | `result` |
| 6 | `king`, you | `kingYou` | `sweep` |
| 6 | `king`, a bot | `kingBot` | `sweep` |
| 7 | `trickWon`, you | `trickYou` | `sweep` |
| 7 | `trickWon`, a bot | `trickBot` | `sweep` |
| 8 | `trumpNamed` | `trumpNamed` | `land` |
| 9 | `cardPlayed` | `cardPlayed` | `land` |
| 9 | `deal` | `deal` | `land` |
| 9 | `flip` | `flip` | `land` |
| 10 | `discard` | `discard` | `land` |
| — | `cardPicked` | `pick` | `tap` |
| — | `skipPressed`, you mediate | `skip` | `tap` |

Tap batches hold one moment each, so their rules need no rank.

### Cue table

| Cue | Vibration (Android) | Sound file | Event parallax |
|---|---|---|---|
| `waveCleared` | `[60, 40, 60, 40, 60, 40, 160]` | `wave-cleared` | **Open** (#185), for example `celebrate` |
| `gameWin` | `[60, 40, 60, 40, 120]` | `game-win` | **Open** (#185), for example `celebrate` |
| `gameLoss` | `[150]` | `game-loss` | None |
| `showdownCalledYou` | `[80, 60, 80]` | `showdown-called` | **Open** (#185), for example `lift` |
| `showdownCalledOther` | None | `showdown-called` | None |
| `showdownWin` | `[60, 40, 60]` | `showdown-win` | None |
| `showdownLoss` | `[60, 40, 60]` | `showdown-loss` | None |
| `showdownMediated` | `[60, 40, 60]` | `showdown-win` | None |
| `handWin` | None | `hand-win` | None |
| `handLoss` | None | `hand-loss` | None |
| `kingYou` | `[35, 60, 35]` | `king-you` | None |
| `kingBot` | None | `king-bot` | None |
| `trickYou` | `[35]` | `trick-you` | None |
| `trickBot` | None | `trick-bot` | None |
| `trumpNamed` | None | `trump-named` | None |
| `cardPlayed` | None | `card-play` | None |
| `deal` | None | `deal` | None |
| `flip` | None | `flip` | None |
| `discard` | None | `discard` | None |
| `pick` | `[8]` | None | None |
| `skip` | `[20]` | None | None |

- **Event parallax motion names** (`celebrate`, `lift`) are placeholders until #185 defines the motions. Keep event parallax for a few rare cues, by principle 2.
- **Each channel plays its part on its own.** It checks its own [gates](#gates) and [dropping](#dropping) rules, so a cue degrades gracefully: with Sound off, the vibration and the motion still play; on an iPhone, the sound and the motion still play.
- **All parts start at the batch's screen time,** so they land together.
- A cue row can point several rules at the same response. `showdownMediated` reuses `showdown-win`, for example.

### Cue rules

The module picks **one cue per batch**: the first rule, in rank order, that any of the batch's moments matches.

- **No your-turn cue.** The table already shows whose turn it is.
- **A game that ends mid-trick** (a King point reaches 10) plays only `gameWin` or `gameLoss`, never a King or trick cue as well. The rule table gives this: the `gameOver` batch holds the game-end moment.
- **A Showdown hand.** The `showdownCalled` rules rank above the `handScored` rules, so a Showdown call replaces the hand-result cue: both come from the same action.
- **The Mediator.** While you mediate, only two things vibrate:
  - **The Showdown ends:** `showdownMediated` with its `[60, 40, 60]` pattern, whether the Showdown played out or you skipped it.
  - **You press Skip ▶:** a short `[20]` tap.

  The rule table gives this through `showdownCalledOther` and `showdownMediated`. The Showdown's trick and King cues are a bot's, so they don't vibrate. All the sounds still play, except during the skip.
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

Moments of interest are rows in the module's [rule table](#rule-table), above the ordinary rule for the same moment, with their own rows in the [cue table](#cue-table). Adding one changes only `feedback/`, unless it needs a fact the game doesn't send yet.

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
| A Showdown won 5–0 | The `showdownScored` cue | `tricks` per Showdown player | One player takes all 5 Showdown tricks | Candidate |
| A comeback win | `gameWin` | `you`, `maxDeficit` (derived) | You win after trailing the leader by **Open** points or more | Candidate |
| Your first King point of the game | `king` | `you`, `kingsThisGame` (derived) | Your King point count goes from 0 to 1 | Candidate |
| You clear the final wave | `waveCleared` | `mode`, `wave`, `finalWave` (derived) | Clearing the last wave of the Waves table | Candidate |
| `derived:trickStreak` | `trickWon` | The module's memory of `trickWon` | You win **Open** (3?) tricks in a row, across hands | Candidate, derived |
| `derived:perfectHand` | The `handScored` cue | The module's memory of `trickWon` in the hand | You win every main trick of a hand | Candidate, derived |
| `derived:kingThenLead` | `king` | The `king` moment and the scores before it | A King point that also changes the lead, see [Lead change](#lead-change) | Candidate, derived |
| `derived:pressure` | The `king` or `handScored` cue | `scoresAfter` over the game | A bot reaches 9 while you're behind, the first time this game | Candidate, derived |
| `derived:revenge` | The `showdownScored` cue | The module's memory of `showdownScored` | You win a Showdown against the seat that won the previous one | Candidate, derived |
| `derived:matchPoint` | The `king` or `handScored` cue | `scoresAfter` over the game | A seat reaches 9 for the first time this game. Two cues: you, or a bot. | Candidate, derived, see [Drama](#drama-in-the-rules) |
| A steal | The `handScored` cue | `outcome`, `you` | A sweep by a seat other than the namer (+3) | Candidate, see [Drama](#drama-in-the-rules) |
| `derived:decider` | The `trickWon` cue at trick 7 | `tricksWon` at trick 6 | Trick 7 decides between a clear win and a Showdown | Candidate, derived, see [Drama](#drama-in-the-rules) |
| `derived:kingKilled` | The `trickWon` cue | Your `cardPlayed` King and the trick's winner | A King you played loses its trick | Candidate, derived, see [Drama](#drama-in-the-rules) |
| A denial | The `handScored` or `showdownScored` cue | `you`, `scoresBefore` | You win a hand or a Showdown while a bot is at 9 | Candidate, see [Drama](#drama-in-the-rules) |
| Knocked back | The `showdownScored` cue | `scoresBefore`, `scoresAfter` | A Showdown loss takes a seat off 9 | Candidate, see [Drama](#drama-in-the-rules) |

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
| A hand result changes the lead | Any of the above, at the hand result | **Open**: a separate moment of interest, replacing the `handScored` cue |

### Adding a moment of interest

1. Add a row to **Candidates** with the facts it needs and a precise definition.
2. Decide where it comes from:
   - **From one moment:** a rule in the module's table.
   - **From a pattern over time:** a derived event in the module.
   - **From game knowledge the moments don't carry:** a new fact the game sends. Public only.
3. Measure how often it fires.
4. Add its rule row, above the ordinary rule for that moment. If it needs its own response, add a cue row: a sound file (see [Sound files](#sound-files)), a vibration pattern, an event parallax motion, or any mix.

## Variety

The rule table and the cue table on their own give the same response to the same situation every time. Five additions make feedback vary and build with the game, while staying predictable for tests and replays:

- **Variants:** a cue can have several versions of each part.
- **Novelty:** a special cue that played recently gives way to another version, or to the ordinary cue.
- **Escalation:** the stakes of the moment pick a stronger or a quieter version.
- **Layering:** a second rule can add one part on top of the main cue.
- **Parameters:** a part can scale with the moment's facts.

They are all data in the cue table plus a few lines in `cueFor`. None of them changes the game or the contract, apart from the public facts listed in [Drama in the rules](#drama-in-the-rules).

### Drama in the rules

Where the game's rules create tension, read from the Engine's scoring (`index.html`, section 4):

| Rule | Why it creates drama |
|---|---|
| The game ends the moment a seat reaches 10, even mid-trick | Any King point or hand point can end the game at once. A seat at 9 makes every trick dangerous. |
| Each King that wins a trick scores +1 | A King is a point waiting to happen, and a King beaten by a trump or a higher card is a point lost in plain view. |
| The hand winner scores 1, a namer sweep 2, a sweep by anyone else 3 | Sweeping the namer in their own trump is the biggest single hand result and a reversal. A hand can be worth up to 7 points with Kings (README, **Length of a game**). |
| A 3–3–1 split starts a Showdown; the 1-trick seat mediates | The last trick of a hand can decide between a clear win and a Showdown. The counts are public: they're the circles. |
| Showdown: winner +1, loser −1 (not below 0) | The only rule that takes points away, so a Showdown can knock a leader off match point. |
| Games last about 10 hands (6 to 14 in nine games out of ten) | Tension can build over a game. Early hands are calm, late hands are tight. |

From these, the moments most likely to feel dramatic:

| Drama | Detected by | Source |
|---|---|---|
| **Match point:** a seat reaches 9 for the first time this game | `scoresAfter` | Derived: `derived:matchPoint`, with `you` or a bot |
| **Sudden death:** the game ends mid-trick on a King point | `gameEnded.byKing` | One moment |
| **Steal:** a sweep by a seat other than the namer (+3) | `handScored.outcome === 'NON_NAMER_SWEEP'` | One moment, `you` or a bot |
| **The decider:** the last trick decides between a clear win and a Showdown | `trickWon.tricksWon` at trick 6 of 7: one result of trick 7 makes 3–3–1 | Derived: `derived:decider`, armed after trick 6, resolved at trick 7 |
| **King killed:** a King you played loses its trick | The memory's `cardPlayed` (yours, a King) and the trick's `trickWon` (another seat) | Derived: `derived:kingKilled` |
| **Denial:** you win a hand or a Showdown while a bot is at 9 | `scoresBefore`, `you` | One moment |
| **Knocked back:** a Showdown loss takes a seat off 9 | `showdownScored`, `scoresBefore` and `scoresAfter` | One moment |
| **Lead change, comeback, streak, perfect hand** | See [Moments of interest](#moments-of-interest) | |

How often each one fires is a guess until it's measured. Measure each with the bot games in `tests/` before it gets a special cue (rule 4 in [Moments of interest](#moments-of-interest)).

### Stakes

The module works out the **stakes** of each batch from public scores only, as a level from 0 to 3:

| Level | Name | When |
|---|---|---|
| 0 | **Calm** | No seat above 6 |
| 1 | **Close** | A seat at 7 or 8 |
| 2 | **Match point** | A seat at 9 |
| 3 | **Decider** | A seat at 9, and this moment can end the game: a King point for that seat, or the hand result |

The cut-offs are draft values (`STAKES_CLOSE`, `STAKES_MATCH`), to tune once the bot games show how often each level comes up.

### Variants

A cue's part can be a list rather than one value:

```js
trickYou: {
  sound:   ['trick-you', 'trick-you-2', 'trick-you-3'],
  vibrate: [[35]],
  parallax: null,
  stakes: { 2: { sound: ['trick-you-tense'] }, 3: { sound: ['trick-you-tense'], vibrate: [[35, 40, 35]] } }
}
```

- **Picking a variant is deterministic.** The module hashes the cue's name, the batch's state `version` and the batch's facts, and uses the hash to pick from each list. The same game gives the same picks, so a replay sounds the same as the live game. Different games give different picks.
- **No random number generator, and no seed.** The game's RNG must not be used: drawing from it would change every deal. The game's seed must not be sent either: it would reveal the deal, which breaks the public-facts rule.
- **Each part picks on its own,** so a cue with 3 sounds and 2 patterns has 6 combinations.
- Variant sound files follow the base name with a number: `trick-you-2.wav`. A missing variant is skipped silently, like any missing file, and the module picks from the rest.

### Escalation

Two things can escalate a cue:

1. **Stakes.** A cue row can have a `stakes` entry for levels 1 to 3. The highest entry at or below the current level replaces the matching parts. Parts it doesn't name stay as they are. So a trick won at match point can sound tense while its vibration stays the same.
2. **Counts.** A derived event that counts, such as `derived:trickStreak`, passes its count to the cue. A cue row can have a `count` entry, such as `{ 3: …, 5: … }`, chosen the same way: a streak of 5 plays the stronger version.

Escalation never adds a channel the player turned off, and never breaks the dropping rules. At the Decider level, `GAP_SOUND_MS` and `GAP_VIBRATE_MS` still apply.

### Novelty

The module's memory records when each **special** cue last played (a moment of interest, a derived event or an escalated version), counted in hands:

1. A special cue that played within the last `NOVELTY_HANDS` hands picks a variant it hasn't used this game.
2. If it has no unused variant, it falls back to the ordinary cue for that moment.
3. Ordinary cues are exempt: a card sound plays every time.

Novelty memory is per game, cleared with the rest of the memory. A replay of one game then matches the live game exactly. Novelty across games would make replays differ.

### Layering

One cue per batch stays the rule, with one exception: a rule marked `layer` adds **one part** on top of the batch's main cue instead of competing with it.

```js
// Rule table
{ when: m => m.type === 'derived:matchPoint' && m.you, cue: 'matchPointLift', layer: true },

// Cue table: a layer cue names exactly one channel
matchPointLift: { parallax: 'lift' }
```

1. The module picks the main cue as usual: the first non-layer rule that matches.
2. It then picks **at most one** layer: the first `layer` rule that matches.
3. **A layer adds a channel the main cue doesn't use.** If the main cue already uses that channel, the layer is dropped. A layer never replaces or doubles a part.
4. A layer cue names exactly one channel: a sound, a vibration pattern or an event parallax motion.
5. Layers follow the same gates, dropping, variants, escalation and novelty as main cues.

So a King point at match point can play the King sound and vibration from the main cue, plus a parallax lift from the layer. The limit of one layer per batch keeps principle 2: at most one extra part, ever.

### Parameters

A part can be a function of the moment's facts instead of a fixed value. Parameters change **how much**, never **whether**: a parameter can't turn a channel on, and it can't change which cue plays.

| Part | Parameter | Example |
|---|---|---|
| Sound | `gain`: 0 to 1, multiplied by the Half or Full level | Louder for a bigger hand: `gain: m => 0.6 + 0.1 * m.points` |
| Sound | `rate`: playback speed, 0.9 to 1.1, which also shifts pitch | Slightly higher with each trick of a streak: `rate: m => 1 + 0.02 * m.count` |
| Vibration | `scale`: multiplies each pulse, 0.5 to 2 | Longer for a larger lead: `scale: m => 1 + 0.25 * lead(m)` |
| Event parallax | `amount`: 0 to 1, how strong the motion is | Stronger for a bigger comeback: `amount: m => Math.min(1, m.maxDeficit / 6)` |

```js
handWin: { sound: 'hand-win', gain: m => 0.6 + 0.1 * m.points }
```

- **Clamped.** The module clamps every parameter to its range, so a wrong formula can't make a part silent, too loud or too long.
- **Pure.** A parameter reads only the batch's facts and the stakes level. It never reads the memory, the clock or a random value, so the same batch always gives the same result and replays match.
- **A bad parameter falls back.** If a function throws or returns something that isn't a number, the part plays at its default.
- **Vibration patterns stay within limits.** After scaling, each pulse is capped at `VIBRATE_MAX_MS` and the whole pattern at `VIBRATE_TOTAL_MS`.

### Constants

| Constant | Draft value | Meaning |
|---|---|---|
| `VIBRATE_MAX_MS` | 300 | The longest single pulse after scaling |
| `VIBRATE_TOTAL_MS` | 1500 | The longest whole pattern after scaling |
| `STAKES_CLOSE` | 7 | The score that makes the stakes Close |
| `STAKES_MATCH` | 9 | The score that makes the stakes Match point. One below the winning score. |
| `NOVELTY_HANDS` | 3 | How many hands a special cue waits before it can repeat its version |

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
| `trick-you.wav` | `trickYou` | You win a trick | 150 to 300 ms |
| `trick-bot.wav` | `trickBot` | A bot wins a trick. Softer than `trick-you`. | 150 to 300 ms |
| `king-you.wav` | `kingYou` | Your King point | 250 to 500 ms |
| `king-bot.wav` | `kingBot` | A bot's King point. Distinct from `king-you`. | 250 to 500 ms |
| `hand-win.wav` | `handWin` | You win the hand | 400 to 800 ms |
| `hand-loss.wav` | `handLoss` | A bot wins the hand | 400 to 800 ms |
| `showdown-called.wav` | `showdownCalledYou`, `showdownCalledOther` | A Showdown is called | 500 to 1000 ms |
| `showdown-win.wav` | `showdownWin`, `showdownMediated` | You win the Showdown, or you mediate and it ends | 400 to 800 ms |
| `showdown-loss.wav` | `showdownLoss` | You lose the Showdown | 400 to 800 ms |
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
3. The [rule table](#rule-table) picks one cue for the batch: the first match in rank order, so moments of interest and derived events come first.
   The module works out the [stakes](#stakes), applies [escalation](#escalation) and [novelty](#novelty), and picks each part's [variant](#variants).
   It then picks at most one [layer](#layering), and works out the [parameters](#parameters).
   Each channel then takes its part from the result.
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
- The rule table, the cue table, the derived-event patterns, the dropping limits, the stakes and novelty limits, and `MEMORY_MAX` are named constants. The cue table holds each cue's vibration pattern, sound file and event parallax motion.
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
| Variety | T1 | `tests/feedback.js`: the same batch gives the same variant every time; at most one layer, and never on a channel the main cue uses; parameters clamp, fall back on a bad value, and never turn a channel on; stakes levels from scores; escalation picks the right entry and never adds a channel that's off; novelty rotates, then falls back; a missing variant is skipped |
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
| 26 | Parallax | **Event parallax** is a channel of the feedback module and shares its rule table. **Common parallax** lives outside it and ignores moments. Both stop at Instant. |
| 27 | Cue tables | Two tables: a rule table for when (first match wins) and a cue table for what, with a column for each channel: vibration, sound and event parallax |
| 28 | Variants | A cue's parts can be lists. The pick is a hash of the cue, the state version and the facts: no RNG, no seed. |
| 29 | Escalation | Stakes from public scores (Calm, Close, Match point, Decider) and counts from derived events pick stronger versions |
| 30 | Novelty | A special cue that played in the last `NOVELTY_HANDS` hands uses an unused variant or the ordinary cue. Per game, so replays match. |
| 31 | Drama | Match point, sudden death, steal, the decider, King killed, denial and knocked back join the candidates, each measured before it gets a cue |
| 32 | Layering | A rule marked `layer` adds one part, on a channel the main cue doesn't use. At most one layer per batch. |
| 33 | Parameters | A part can scale with the facts: sound gain and rate, vibration scale, parallax amount. Clamped, pure, and never turns a channel on. |
