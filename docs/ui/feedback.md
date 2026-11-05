# Feedback: vibration, sound and event parallax

> **Status: draft.** Planning for [#184 Haptics](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/184), [#183 Sound effects](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/183) and the event part of [#185 Parallax](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/185). Nothing is built yet. The remaining choices are listed in [Open items](#open-items).

*Feedback* is what the game does besides drawing the table: a vibration, a sound or a parallax motion at a game moment. The game sends moments to an optional feedback module, and the module decides how to respond. This page defines the module: its cues, when each one plays, when nothing plays, and what is dropped when cues collide. How the game and the module talk is in the [Feedback contract](feedback-contract.md).

Moment names come from [Game moments](moments.md). Area and part names come from [Vocabulary](vocabulary.md).

## Terms

| Term | Meaning |
|---|---|
| **Moment** | One thing that happened, with its public facts, sent by the game. For example `trickWon`. |
| **Batch** | The moments of one action that the player sees at the same time, sent together. |
| **Anchor** | When a batch is sent: as cards land, at the trick sweep, at a result, at the game-over dialog, or at a tap. |
| **Derived event** | A moment the module creates itself from a pattern in earlier moments. For example `derived:trickStreak`. |
| **Rule** | A row of the rule table: what a batch must match, and the cue it gets. |
| **Cue** | A row of the cue table: what each channel does. |
| **Part** | One channel's share of a cue: a vibration pattern, a sound preset or a parallax motion. |
| **Preset** | The settings that `synth.js` turns into one sound. |
| **Palette** | The presets for one felt: Classic, Spring, Summer, Fall or Winter. |
| **Channel** | Vibration, sound or event parallax. |
| **Layer** | One extra part added on top of a batch's main cue. |
| **Moment of interest** | A rare situation with a cue of its own, above the ordinary cue for that moment. |
| **Stakes** | How tense the game is at a batch: Calm, Close, Match point or Decider. |

## Principles

1. **Feedback is a bonus.** The game never depends on it. An iPhone has no vibration, a phone can be on silent, and the module can be missing. Every cue repeats something the table already shows.
2. **Keep it rare.** A cue that plays all the time becomes noise. Vibration and parallax are kept for moments that matter to you. Sound can mark more moments, but quietly.
3. **Follow the screen.** A cue plays when the player *sees* the moment, not when the Engine applies it.
4. **Drop, never wait.** A cue that can't play on time is dropped. Nothing is queued for later.
5. **Instant turns it all off.** At speed Instant, no vibration, sound or parallax plays, event or common. No setting overrides this, including **Sound in replays**.
6. **The module is optional.** The game sends moments whether or not anything listens. Without the module, the game is silent and still, and nothing says so.
7. **Public facts only.** Feedback never reveals a card someone holds unseen. Every moment, and so every cue, comes from what your seat can see.
8. **Replays match.** The same game with the same settings gives the same feedback, live or in the replay viewer. Nothing in the module is random.

## Channels

| Channel | API | Supported on | Notes |
|---|---|---|---|
| Vibration | `navigator.vibrate(pattern)` | Chrome and Chrome-based browsers on Android, including the installed app | A new call replaces the pattern still running. Not on iPhone: no workarounds are used. |
| Sound | Web Audio (`AudioContext`) | All supported browsers | Made by `feedback/synth.js` from the presets of the current [theme palette](#theme-palettes). Never `<audio>` elements. |
| Event parallax | Defined in #185 | Defined in #185 | Driven by the cue table, see [Parallax](#parallax). |

Each channel plays its part on its own, under its own [gates](#gates) and [dropping](#dropping) rules, so a cue still works with any channel missing: with Sound off, the vibration and the motion still play; on an iPhone, the sound and the motion still play.

## Settings

The module adds these rows to **Settings → Table**, under the heading **Sound and touch**, once it has loaded (see [Feedback contract: Settings in two files](feedback-contract.md#settings-in-two-files)).

| Row | Control | Shown when | Default | Description text (draft) |
|---|---|---|---|---|
| **Vibration** | Switch | `navigator.vibrate` exists | Off | Short vibrations when you win a trick or a King point, pick a card, and at the end of a game. |
| **Sound** | Off, Half, Full | Always | Off | Short sounds for cards, tricks and results. Half plays them at half volume. |
| **Sound in replays** | Switch | Sound isn't Off | Off | The replay viewer plays the same sounds, at the Sound level. |

- Vibration and Sound are separate, so you can have either without the other.
- The device volume sets the overall level. Half and Full scale it inside the game.
- All three are kept on the device only: one `localStorage` key each, read inside `try`, the same way as the Awards switch. They are not part of `saveSettings()`, a game save or a backup.
- **Reset this tab** sets all three back to Off.
- Event parallax settings belong to #185.

## Timing

| Clock | Meaning | Where it happens |
|---|---|---|
| **Engine time** | `act()` applies an action and its events exist. | `act()` in section 8 |
| **Screen time** | The player sees the result: a card lands, a trick is swept, a result shows. | The end of an `Fx` motion, the release of `holdResult()`, and the wait before `showGameOver` |
| **Tap time** | The player taps something. | Input handlers in section 8 |

The game sends each batch at its screen time, or at tap time for a tap (see [Feedback contract: Anchors](feedback-contract.md#anchors)). Every part of a cue starts then, so they land together.

Pacing by speed, from `DELAYS` and `Fx.STEP`, in milliseconds:

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

A new moment of interest is a rule row, plus a cue row if it needs a response of its own. Changing how a channel responds touches only the cue table, never the rules.

### Rule table

The module tries the rules in rank order, and the **first match wins**: a lower number is tried first. Moments of interest and derived events go above the ordinary rule for the same moment.

| Rank | Matches | Cue | Anchor |
|---|---|---|---|
| 1 | `waveCleared` | `waveCleared` | `gameOver` |
| 2 | `gameEnded`, you won | `gameWin` | `gameOver` |
| 2 | `gameEnded`, a bot won | `gameLoss` | `gameOver` |
| 3 | `showdownCalled`, you play in it | `showdownCalledYou` | `result` |
| 3 | `showdownCalled`, you mediate | `showdownCalledOther` | `result` |
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

| Cue | Vibration (Android) | Sound preset | Event parallax |
|---|---|---|---|
| `waveCleared` | `[60, 40, 60, 40, 60, 40, 160]` | `wave-cleared` | `celebrate` (placeholder) |
| `gameWin` | `[60, 40, 60, 40, 120]` | `game-win` | `celebrate` (placeholder) |
| `gameLoss` | `[150]` | `game-loss` | None |
| `showdownCalledYou` | `[80, 60, 80]` | `showdown-called` | `lift` (placeholder) |
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

Parallax motion names are placeholders until #185 defines the motions. Several rules can share one response: `showdownMediated` reuses `showdown-win`.

### Cue rules

- **One cue per batch**, plus at most one [layer](#layering).
- **No your-turn cue.** The table already shows whose turn it is.
- **A game that ends mid-trick** (a King point reaches 10) plays only the game-end cue, or sudden death. The game folds that trick's `trickWon` and `king` moments into the `gameOver` batch, where the game-end rules rank first.
- **A Showdown hand.** The `showdownCalled` rules rank above the `handScored` rules, so a Showdown call replaces the hand-result cue: both come from the same action.
- **The Mediator.** While you mediate, only two things vibrate: the Showdown's end (`showdownMediated`), whether it played out or you skipped it, and your tap on **Skip ▶** (`skip`). A skip jumps straight to the result: if the result comes within `GAP_VIBRATE_MS` of the tap, its pattern replaces the tap's. The Showdown's trick and King cues are a bot's, so they don't vibrate. All the sounds still play, except during the skip.
- **Autoplay.** Your seat's cues play as if you played it yourself, vibration included.
- **No cue** for a pass, Hand void, Hand abandoned, a refused move, or any button other than **Skip ▶** while you mediate.
- **Taps.** Picking or unpicking a card in your hand vibrates `[8]` and plays no sound. It skips the gap check in [Dropping](#dropping).

## Moments of interest

A *moment of interest* is a rare situation with its own rule, above the ordinary rule for that moment, and usually its own cue. It **replaces** the ordinary cue, never adds to it. Only a [layer](#layering) adds.

### Rules

1. **Public facts only** (principle 7).
2. **The game derives what needs game knowledge.** Facts such as "the game ended on a King point" are worked out by the game and sent with the moment. The module never reads the game. It only remembers the moments it received, for [derived events](#derived-events).
3. **The most specific match wins.** A moment of interest ranks above the ordinary rule for the same moment, and the dropping rules still apply.
4. **Keep them rare.** A moment of interest that fires every game stops being special. Measure how often each one fires across many bot games (`tests/`) before giving it a cue.
5. **A missing sound falls back.** Until a moment of interest's preset exists, it plays the ordinary cue's sound with its own vibration and motion. A moment of interest is never quieter than the moment it replaces.

### Drama in the rules

The candidates come from where the game's scoring (`index.html`, section 4) creates tension:

| Rule | Why it creates drama |
|---|---|
| The game ends the moment a seat reaches 10, even mid-trick | Any King point or hand point can end the game at once. A seat at 9 makes every trick dangerous. |
| Each King that wins a trick scores +1 | A King is a point waiting to happen, and a King beaten by a trump or a higher card is a point lost in plain view. |
| The hand winner scores 1, a namer sweep 2, a sweep by anyone else 3 | Sweeping the namer in their own trump is the biggest single hand result and a reversal. A hand can be worth up to 7 points with Kings (README, **Length of a game**). |
| A 3–3–1 split starts a Showdown; the 1-trick seat mediates | The last trick of a hand can decide between a clear win and a Showdown. The counts are public: they're the circles. |
| Showdown: winner +1, loser −1 (not below 0) | The only rule that takes points away, so a Showdown can knock a leader off match point. |
| Games last about 10 hands (6 to 14 in nine games out of ten) | Tension can build over a game. Early hands are calm, late hands are tight. |

### Candidates

**Source** says where each one comes from: one moment, a derived event from the module's memory, or a fact the game must add.

| Moment of interest | Source | Replaces the cue for | Definition | Status |
|---|---|---|---|---|
| **Lead change** on a King point: you take the lead, or a bot takes it from you | One moment: `king` with `scoresBefore`, `scoresAfter` | `king` | See [Lead change](#lead-change) | Candidate, **Open** |
| **Match point:** a seat reaches 9 for the first time this game. Two cues: you, or a bot. | Derived: `derived:matchPoint` | `king` or `handScored` | A seat's score reaches 9 for the first time this game | Candidate |
| **Sudden death:** the game ends on a King point | One moment: `gameEnded.byKing` | `gameEnded` | The King point that takes a seat to 10. Two cues: you, or a bot. | Candidate |
| **Steal:** a sweep by a seat other than the namer (+3) | One moment: `handScored.outcome` | `handScored` | `outcome === 'NON_NAMER_SWEEP'`. Two cues: you, or a bot. | Candidate |
| **The decider:** the last trick decides between a clear win and a Showdown | Derived: `derived:decider` | `trickWon` at trick 7 | After trick 6, the counts in `tricksWon` allow a 3–3–1 split on trick 7 | Candidate |
| **King killed:** a King you played loses its trick | Derived: `derived:kingKilled` | `trickWon` | Your `cardPlayed` is a King, and the trick's `trickWon` is another seat's | Candidate |
| **Denial:** you win while a bot is at 9 | One moment: `handScored` or `showdownScored` with `scoresBefore` | `handScored` or `showdownScored` | You win the hand or the Showdown, and a bot's `scoresBefore` is 9 | Candidate |
| **Knocked back:** a Showdown loss takes a seat off 9 | One moment: `showdownScored` | `showdownScored` | The loser's score goes from 9 to 8 | Candidate |
| **Showdown sweep:** a Showdown won 5–0 | One moment: `showdownScored.tricks` | `showdownScored` | One player takes all 5 Showdown tricks | Candidate |
| **Perfect hand:** you win every main trick | Derived: `derived:perfectHand` | `handScored` | All 7 of the hand's `trickWon` moments are yours | Candidate |
| **Trick streak** | Derived: `derived:trickStreak` | `trickWon` | You win **Open** (3?) tricks in a row, across hands | Candidate, **Open** |
| **Comeback win** | Game fact: `maxDeficit` | `gameEnded` | You win after trailing the leader by **Open** points or more | Candidate, **Open** |
| **Revenge** | Derived: `derived:revenge` | `showdownScored` | You win a Showdown against the seat that won the previous one | Candidate |
| **Joker win** | One moment: `trickWon.card` | `trickWon` or `king` | Your winning card is the Joker | Candidate |
| **Last trick** | One moment: `trickWon` | `trickWon` | You win trick 7 of the main hand | Candidate |
| **First King** | Game fact: `kingsThisGame` | `king` | Your King point count goes from 0 to 1 | Candidate |
| **Final wave** | One moment: `waveCleared.finalWave` | `waveCleared` | Clearing the last wave of the Waves table | Candidate |

How often each one fires is a guess until it's measured.

### Lead change

The leaders are every seat with the top score. Settle these cases before building the lead-change cue:

| Case | Example (You, West, East) | Counts? |
|---|---|---|
| You go from behind into sole first place | `5, 6, 3` → `7, 6, 3` | Yes |
| You go from behind to a tie for first | `5, 6, 3` → `6, 6, 3` | **Open** |
| You go from a tie for first into sole first place | `6, 6, 3` → `7, 6, 3` | **Open** |
| A bot passes you | `6, 5, 3` → `6, 7, 3` | Yes, as "a bot takes the lead from you" |
| One bot passes the other while you're behind | `3, 6, 5` → `3, 6, 7` | **Open**, probably no |
| The King point takes a seat to 10 | `9, 8, 3` → `10, 8, 3` | No: sudden death or the game-end cue outranks it |
| A Showdown King point | Any of the above, in a Showdown | **Open** |
| A hand result changes the lead | Any of the above, at the hand result | **Open**: a separate moment of interest on `handScored` |

### Adding a moment of interest

1. Add a row to **Candidates** with a precise definition.
2. Decide its source:
   - **One moment:** a rule in the rule table.
   - **A pattern over time:** a [derived event](#derived-events).
   - **Game knowledge the moments don't carry:** a new fact the game sends, public only (see [Feedback contract: Moments](feedback-contract.md#moments)).
3. Measure how often it fires.
4. Add its rule row above the ordinary rule for that moment. If it needs its own response, add a cue row, and a preset to [Sounds](#sounds).

## Derived events

The module can create its own events from the moments it receives. It watches the stream for a pattern, such as a streak or a sequence, and when the pattern completes, it adds a derived event to the current batch.

- A derived event goes through the rule table like any moment, and outranks the ordinary rule for that batch.
- Its type starts with `derived:`, such as `derived:trickStreak`, so it never collides with a type the game sends.
- A derived event never spawns another one. Only moments from the game are watched, so there are no chains or loops.
- A derived event that counts, such as a streak, carries its `count` for [escalation](#escalation).

### The module's memory

- **Only moments.** It records nothing but the batches the game sent, so it can't reveal anything the table doesn't show.
- **Short.** It keeps the moments of the current game only, capped at `MEMORY_MAX`.
- **Cleared** by a `cancel` with `scope: 'game'`: a new game, a resume or reload (a restored game sends no history), or a jump in the replay viewer.
- **Gaps break patterns.** Moments the game doesn't send, at Instant or during a skip, are missing, so a pattern that spans them doesn't complete. That is the safe result.

## Variety

The tables alone give the same response to the same situation every time. Six additions make feedback vary and build with the game, while keeping replays the same (principle 8). All are data in the cue table and a few lines in `cueFor`.

### Stakes

The module works out the stakes of each batch from public scores only:

| Level | Name | When |
|---|---|---|
| 0 | **Calm** | No seat at `STAKES_CLOSE` or above |
| 1 | **Close** | A seat at `STAKES_CLOSE` (7) or 8 |
| 2 | **Match point** | A seat at `STAKES_MATCH` (9) |
| 3 | **Decider** | A seat at 9, and this batch can end the game: a King point for that seat, or the hand result |

### Variants

A part can be a list rather than one value:

```js
trickYou: {
  sound:   ['trick-you', 'trick-you-2', 'trick-you-3'],
  vibrate: [[35]],
  parallax: null,
  stakes: { 2: { sound: ['trick-you-tense'] }, 3: { sound: ['trick-you-tense'], vibrate: [[35, 40, 35]] } }
}
```

- **The pick is a hash** of the cue's name, the batch's state `version` and its facts. The same game gives the same picks; different games give different ones.
- **No random number generator, and no seed.** Drawing from the game's RNG would change every deal, and the seed would reveal the deal.
- **Each part picks on its own,** so 3 sounds and 2 patterns give 6 combinations.
- A missing variant preset is skipped silently, and the module picks from the rest.

### Escalation

1. **Stakes.** A cue row can have a `stakes` entry for levels 1 to 3. The highest entry at or below the current level replaces the parts it names. The other parts stay as they are.
2. **Counts.** A cue row can have a `count` entry, such as `{ 3: …, 5: … }`, chosen by the derived event's `count` in the same way.

Escalation never adds a channel the player turned off, and never bypasses the dropping rules.

### Novelty

The module's memory records when each **special** cue last played (a moment of interest, a derived event or an escalated version), counted in hands:

1. A special cue that played within the last `NOVELTY_HANDS` hands picks a variant it hasn't used this game.
2. If it has no unused variant, it falls back to the ordinary cue for that moment.
3. Ordinary cues are exempt: a card sound plays every time.

Novelty memory lasts one game, so a replay of a game matches the live game exactly.

### Layering

A rule marked `layer` adds **one part** on top of the batch's main cue instead of competing with it:

```js
// Rule table
{ when: m => m.type === 'derived:matchPoint' && m.you, cue: 'matchPointLift', layer: true },
// Cue table: a layer cue names exactly one channel
matchPointLift: { parallax: 'lift' }
```

1. The module picks the main cue: the first rule that isn't a layer.
2. It then picks **at most one** layer: the first `layer` rule that matches.
3. A layer adds a channel the main cue doesn't use. If the main cue already uses it, the layer is dropped. A layer never replaces or doubles a part.
4. Layers follow the same gates, dropping, variants, escalation and novelty as main cues.

### Parameters

A part can be a function of the batch's facts. Parameters change **how much**, never **whether**: they can't turn a channel on or change which cue plays.

| Part | Parameter | Range | Example |
|---|---|---|---|
| Sound | `gain`, multiplied by the Half or Full level | 0 to 1 | Louder for a bigger hand: `gain: m => 0.6 + 0.1 * m.points` |
| Sound | `rate`, playback speed, which also shifts pitch | 0.9 to 1.1 | Higher with each trick of a streak: `rate: m => 1 + 0.02 * m.count` |
| Vibration | `scale`, multiplies each pulse | 0.5 to 2 | Longer for a larger lead: `scale: m => 1 + 0.25 * lead(m)` |
| Event parallax | `amount`, how strong the motion is | 0 to 1 | Stronger for a bigger comeback: `amount: m => Math.min(1, m.maxDeficit / 6)` |

- **Clamped** to its range, and vibration patterns to `VIBRATE_MAX_MS` per pulse and `VIBRATE_TOTAL_MS` in all.
- **Pure.** A parameter reads only the batch's facts and the stakes, never the memory, the clock or a random value.
- **A bad parameter falls back.** If it throws or doesn't return a number, the part plays at its default.

## Parallax

Parallax comes in two kinds:

| Kind | What it is | Where it lives | Driven by |
|---|---|---|---|
| **Event parallax** | A short motion at a game moment, such as a lift of the table at match point | The module, as its third channel | The rule table and cue table, like vibration and sound |
| **Common parallax** | Ambient parallax unrelated to game moments, such as depth in the menu or the felt | Outside the module, under #185 | Its own inputs. It never reads moments. |

- Event parallax follows everything on this page: the gates, dropping, variety, and silence when the module is missing.
- Common parallax works without the module. Removing `feedback/` stops event parallax only.
- Both stop at Instant (principle 5) and respect the system's reduced-motion setting.
- The motions, their settings, their dropping rule and how they avoid cards in flight (`Fx.busyFor()`) belong to #185's spec.

## Gates

The game sends nothing at all in some situations, such as at Instant or during a skip (see [Feedback contract: Sending gates](feedback-contract.md#sending-gates)). The module then drops what it receives while any of these is true:

| Condition | Checked with | Notes |
|---|---|---|
| The contract versions don't match | `v` | Every batch is ignored. |
| The channel's setting is off | Its `localStorage` key | Sound: the level is Off. |
| The channel isn't supported | `typeof navigator.vibrate`, `window.AudioContext` | Event parallax: see #185. |
| No tap yet on this page load | `navigator.userActivation.hasBeenActive` | Browsers block sound and vibration until then. If the property is missing, those channels stay quiet. |
| The replay viewer | The batch's `replay` | No vibration. Sound plays only with **Sound in replays** on. |
| The tab is hidden | `document.hidden` | |
| Speed is Instant | The last `speed` message | A second guard: the game already sends nothing. |

## Dropping

Each part carries its batch's `at` time. When it is due, it goes through these checks in order:

1. **Stale.** The state version changed, the tab is hidden or another tab is more current. Drop it.
2. **Not ready.** Its sound, after the [fallbacks](#fallbacks), hasn't rendered yet or failed. Drop the sound; the other parts still play.
3. **Late.** More than `LATE_MS` past its moment. Drop it.
4. **Too soon.** Less than the channel's minimum gap (`GAP_VIBRATE_MS`, `GAP_SOUND_MS`) since its last part. Drop it, unless it ranks higher, in which case it replaces the last one. A card pick ignores this gap.
5. **Too many sounds.** `MAX_VOICES` sounds are already playing. Drop it.
6. Otherwise, play it once. Nothing is kept for a retry.

A `cancel` message, or the tab becoming hidden, clears every armed part and stops any sound scheduled but not yet started.

## Sounds

The module makes its sounds itself, with the sound generator, instead of loading recorded files. Each sound is a **preset**: a small set of settings that `feedback/synth.js` turns into audio.

### How sounds are made

The generator is the **Card Sound Lab** artifact. It synthesizes physical card sounds with Web Audio in an `OfflineAudioContext`, at 48 kHz mono, from a few primitives: edge ticks, cardstock slaps, air cushions, paper friction and riffle trains. It then trims each sound, fades it, and normalizes it to −18 LUFS (with a small offset per family) under a −1 dBFS peak ceiling. It is plain JavaScript with no dependencies.

A **preset** is three values, as the lab defines a variant:

```js
{ family: 'play', archetype: 0, seed: 2718281828 }   // "B · Card played", "Firm place"
```

The seed derives every design setting and every noise detail, so a preset is a few bytes and renders the same sound every time in the same browser. (Browser engines can differ slightly in their filters, so two browsers may differ by a few 16-bit steps.)

The lab's 8 families, each with 4 archetypes:

| Family | Lab title | Archetypes |
|---|---|---|
| `select` | A · Card selection | Pinch lift, Fan pull, Fingertip tap, Edge flick |
| `play` | B · Card played | Firm place, Soft place, Corner first, Place and skid |
| `deal` | C · Card dealt | Flick to table, Into hand, Long toss, Quick snap |
| `slide` | D · Card slide | Short push, Long drag, Two-step nudge, Pivot turn |
| `shuffle` | E · Card shuffle | Riffle, Riffle and bridge, Overhand, Table wash |
| `reveal` | F · Card turn / reveal | Flip over, Slow peel, Snap flip, Slide and turn |
| `collect` | G · Trick collection | Sweep together, Stack and square, Scoop, Quick gather |
| `confirm` | H · Game-state confirmation | Deck knock, Pack set down, Thumb strum, Square and tap |

| File | Holds |
|---|---|
| `feedback/synth.js` | The lab's synthesis core: its constants, random number generator, primitives, families, `renderRaw` and the finishing steps (trim, fades, loudness and peak). Not its interface, analysis, WAV encoding or ZIP export. About 25 to 30 KB. |
| `feedback/palettes.js` | The presets, grouped into [theme palettes](#theme-palettes). Data only: the family, archetype and seed of each sound, copied from the lab. |
| `feedback/feedback.js` | Decides which sound plays and when. It names sounds by their preset name and never makes audio itself. |

- **Rendering at idle.** When the browser is idle after the module loads, and only while Sound isn't Off, the module renders each preset of the current palette into a buffer, one at a time, never during a game moment. Rendering needs no tap.
- **Silent when missing.** If `synth.js` or `palettes.js` is missing, or a preset fails to render, that sound is skipped: no notice, no toast, no Settings text and nothing in the console. Vibration and event parallax still play. The Event log, when on, records one `SOUND_MISSING` line for each sound, once a page load.
- **Kept in memory.** Rendered buffers stay in memory for the page load. A palette change renders the new palette's presets the same way.

### Theme palettes

Each **Felt** in **Settings → Table → Theme** has a palette: its own sound for each preset. Sound follows the felt, with no setting of its own.

| Felt | Palette | Character (draft) |
|---|---|---|
| **Classic** | `classic` | The base set: every required preset. Crisp and woody. |
| **Spring** | `spring` | Light and bright |
| **Summer** | `summer` | Open and airy |
| **Fall** | `fall` | Warm and low. Its Showdown voice matches the navy Showdown felt. |
| **Winter** | `winter` | Glassy and clear |

- **Classic is the base.** Every other palette overrides only the presets it changes, and inherits the rest from Classic **preset by preset**. A palette can start with its 3 or 4 most distinctive sounds.
- **A palette is a choice of presets.** Each palette picks its own archetypes and seeds within the same families, so Winter's card play is still a card played, with a different hand and table.
- **A palette changes how a role sounds, never what it means.** Your trick always sounds like your trick, in that palette's voice.
- **Showdown voice.** A palette can have Showdown versions of its presets, named with `-showdown`, such as `card-play-showdown`. They play from `showdownCalled` to `showdownScored`. Fall uses them to match its navy Showdown felt. A missing Showdown version uses the ordinary preset.
- **The game tells the module the felt** with the `theme` control message, at load and on every change (see [Feedback contract: Control messages](feedback-contract.md#control-messages)).
- **Color-blind safe colors** don't affect sound.
- **Event parallax** can be themed the same way, such as drifting petals for Spring. The motions belong to #185.
- **The replay viewer** uses your current felt's palette, the same way it shows your current felt.

### Fallbacks

When a sound is asked for, the module looks for it in this order, and plays the first one that has rendered:

1. The current palette's preset, or its Showdown version during a Showdown.
2. Classic's preset with the same name.
3. For a moment of interest or a variant: the ordinary cue's preset ([Moments of interest: Rules](#rules), rule 5).
4. Nothing: the sound is skipped, and the other parts still play.

### Required presets

The 17 presets that the Classic palette must have. They are the full set for ordinary play. **Lab family** is the closest family in the lab today.

| Preset | Cues | Plays | Lab family | Length |
|---|---|---|---|---|
| `card-play` | `cardPlayed` | Each card that lands in a trick, any seat. The most frequent sound: keep it quiet. | `play` | 80 to 150 ms |
| `deal` | `deal` | Once for each deal and Showdown deal | `shuffle` or `deal` | 300 to 600 ms |
| `flip` | `flip` | The kitty card turned up | `reveal` | 100 to 200 ms |
| `discard` | `discard` | Cards reaching the outside pile or the kitty | `slide` | 100 to 200 ms |
| `trump-named` | `trumpNamed` | Trump accepted or named | `confirm` | 200 to 400 ms |
| `trick-you` | `trickYou` | You win a trick | `collect` | 150 to 300 ms |
| `trick-bot` | `trickBot` | A bot wins a trick. Softer than `trick-you`. | `collect`, softer archetype | 150 to 300 ms |
| `king-you` | `kingYou` | Your King point | `confirm` | 250 to 500 ms |
| `king-bot` | `kingBot` | A bot's King point. Distinct from `king-you`. | `confirm`, other archetype | 250 to 500 ms |
| `hand-win` | `handWin` | You win the hand | `result`: Win rise, 2 notes | 400 to 800 ms |
| `hand-loss` | `handLoss` | A bot wins the hand | `result`: Loss fall, 2 notes | 400 to 800 ms |
| `showdown-called` | `showdownCalledYou`, `showdownCalledOther` | A Showdown is called | `shuffle` | 500 to 1000 ms |
| `showdown-win` | `showdownWin`, `showdownMediated` | You win the Showdown, or you mediate and it ends | `result`: Win rise, 3 notes | 400 to 800 ms |
| `showdown-loss` | `showdownLoss` | You lose the Showdown | `result`: Loss fall, 3 notes | 400 to 800 ms |
| `game-win` | `gameWin` | You win the game | `result`: Fanfare | 1 to 2 s |
| `game-loss` | `gameLoss` | A bot wins the game | `result`: Settle | 1 to 2 s |
| `wave-cleared` | `waveCleared` | You clear a wave | `result`: Fanfare, with a riffle tail | 1.5 to 2.5 s |

Card play, the deal, the flip, discards, trump, tricks, King points and the Showdown call use the lab's 8 card families. The 7 results use a ninth family, `result`, which the lab doesn't have yet: see [Result family](#result-family).

### Result family

The 7 result sounds need to say *you won* or *you lost*, not *a card moved*, and some run longer than the lab's 0.98 s cap. A ninth family, **I · Result tones** (`result`), adds pitched sound while keeping the table's physical character: each result starts with a card knock and resolves into tones.

**A new primitive, `chime`.** A short stack of sine partials built on the lab's existing `tone()`, with a shared envelope:

```js
voice.chime(t, { freq: 523.25, partials: [1, 2, 3], weights: [1, 0.35, 0.12], attack: 0.004, decay: 0.45, gain: 0.8 })
```

- Whole-number `partials` give a warm, woody tone. Bell-like ratios, such as `[1, 2.76, 5.4]`, give a glassy one.
- Every note runs through the lab's master bus: the 70 Hz high-pass, the 7.5 kHz low-pass and the faint table reflection.

**Four archetypes:**

| Archetype | Shape | Used for |
|---|---|---|
| **Win rise** | A light knock, then 2 or 3 notes rising by step or by a third, the last one held | `hand-win` (2 notes), `showdown-win` (3 notes) |
| **Loss fall** | A soft knock, then 2 or 3 notes falling, slower and lower, the last one short | `hand-loss` (2 notes), `showdown-loss` (3 notes) |
| **Fanfare** | A deck knock, then a quick 3- or 4-note rising arpeggio into a held chord. Wave cleared adds a riffle tail from the `shuffle` primitives. | `game-win`, `wave-cleared` |
| **Settle** | The pack set down, then one low note with a long, even decay | `game-loss` |

**Design rules:**

- **Every palette has a key.** All result notes come from that palette's scale, so results that come close together, such as a hand win then the game win, sound related and never clash.
- **Not by pitch alone.** A win has more notes and a brighter tone, and a loss has fewer, longer and lower ones, so the difference survives hearing loss in either range and a small phone speaker.
- **Rarer means longer.** A hand result is 0.4 to 0.8 s, a Showdown result 0.5 to 1 s, and a game end or a cleared wave 1 to 2.5 s.
- **The same loudness rules** as the other families: −18 LUFS with a family offset of about −1 dB, under the −1 dBFS ceiling. Results stand out by shape and length, not by volume.
- **Seeded like the others.** The seed sets the exact notes within the archetype's shape, the timing and the partial weights, so a preset is still family, archetype and seed.

**Palettes:** each palette sets the family's key, register and partials:

| Palette | Key and register | Partials |
|---|---|---|
| `classic` | Major, middle register | Warm, whole-number |
| `spring` | Major, one step higher | Light: fewer upper partials |
| `summer` | Open fifths, middle register | Soft and round |
| `fall` | Major, lower register. Its Showdown voice is minor. | Warm, with a touch of the third partial |
| `winter` | Major, higher register | Bell-like ratios |

**What the lab needs:**

1. The `chime` primitive in `createVoice`.
2. The `result` family, with its 4 archetypes, their base settings and a `perform` function, like the other 8.
3. **A length limit per family:** `maxSeconds` and `renderSeconds` on each family, in place of the global `MAX_DURATION_SECONDS` and `RENDER_SECONDS`. The card families keep 0.98 s and 0.96 s; `result` gets 2.5 s and 2.6 s.
4. **Palette settings** passed into `perform`, such as the key, the register and the partials, so one preset renders in each palette's voice. The card families can ignore them.
5. The lab's self-test extended to the new family: not silent, within its length, and the same samples twice.

### Optional presets: moments of interest

One preset per candidate cue, added once its moment of interest is settled. Until then, the moment plays the ordinary cue's sound.

| Preset | Moment of interest | Length |
|---|---|---|
| `lead-you`, `lead-bot` | Lead change | 400 to 800 ms |
| `match-point-you`, `match-point-bot` | Match point | 500 to 1000 ms |
| `sudden-death-you`, `sudden-death-bot` | Sudden death | 1 to 2 s |
| `steal-you`, `steal-bot` | Steal | 500 to 1000 ms |
| `decider` | The decider | 300 to 600 ms |
| `king-killed` | King killed | 250 to 500 ms |
| `denial` | Denial | 400 to 800 ms |
| `knocked-back` | Knocked back | 400 to 800 ms |
| `showdown-sweep` | Showdown sweep | 500 to 1000 ms |
| `perfect-hand` | Perfect hand | 500 to 1000 ms |
| `streak` | Trick streak | 200 to 400 ms |
| `comeback` | Comeback win | 1.5 to 2.5 s |
| `revenge` | Revenge | 400 to 800 ms |
| `joker-win` | Joker win | 250 to 500 ms |
| `last-trick` | Last trick | 200 to 400 ms |
| `first-king` | First King | 250 to 500 ms |
| `final-wave` | Final wave | 2 to 3 s |

### Optional presets: variants

A variant adds a number to the base name: `trick-you-2`, `trick-you-3`. A stakes version adds `-tense`: `trick-you-tense`. The cue table names which variants a cue uses. A variant is usually its base preset with one or two settings changed.

### Sound guidelines

- No silence at the start, so the sound lines up with the moment. A fade-out tail, not a cut.
- Matched levels, peaking at about −3 dBFS, so no sound jumps out at Full.
- The lengths in the tables are targets for the presets. The card families are capped at 0.98 s, and `result` at 2.5 s.
- The lab already applies the level guideline: it normalizes every sound to −18 LUFS with a −1 dBFS ceiling.

### Offline

- `feedback/feedback.js`, `feedback/synth.js` and `feedback/palettes.js` are precached by the service worker at install, from a `FEEDBACK` list in `sw.js`, apart from `ASSETS`.
- **Feedback never breaks the install.** Each file is fetched on its own. A file that fails is skipped and left to runtime caching.
- `tools/publish.sh` adds `feedback` to the files it publishes. A changed file is picked up by the service worker's update check, the same as the icons.

## Performance

- The module loads when the browser is idle, so it never delays the page or the first table. Nothing in the interface waits for it or for its sounds.
- Vibration costs microseconds on the main thread. The device does the vibrating.
- Sound plays on the audio thread. A busy main thread can only delay when a sound starts, and `LATE_MS` drops a sound that starts too late.
- The sounds render only while Sound isn't Off, one preset at a time, never during a game moment. Rendering uses an `OfflineAudioContext`, so it needs no tap. A preset that fails isn't tried again on that page load.
- **Measured:** in headless Chromium on a server, the lab rendered all 32 of its archetypes in 751 ms: 22 ms each at the median, 61 ms at most. A phone is slower, so each render runs in its own idle slot, and no single render may take more than `RENDER_BUDGET_MS`. Required presets render first, then the optional ones the cue table names.
- The playing `AudioContext` is created or resumed on the first tap.
- Sounds are scheduled on `audioContext.currentTime`, not on extra `setTimeout`s.

## Order of operations

The module's side, from loading to a cue playing. The game's side, building and sending batches, is in the [Feedback contract](feedback-contract.md).

### 1. Loading

1. The game adds the module's script when the browser is idle ([Feedback contract: Loading the module](feedback-contract.md#loading-the-module)).
2. The module reads its three device keys, adds its `kct:moment` and first-tap listeners, and sends `kct:feedback-ready`.
3. Once the game shows the **Sound and touch** card, the module fills in its rows.

### 2. Making the sounds

1. Right after it loads, the module loads `synth.js` and `palettes.js` when the browser is idle.
2. Only if Sound isn't Off, it renders the current palette's presets **one at a time**: the required presets first, then the optional ones its cue table names. Each render runs on an `OfflineAudioContext`.
3. A file or preset that fails is marked missing, silently, and isn't tried again on that page load.
4. When Sound changes from Off to Half or Full, rendering starts then, if it hasn't already.
5. On a `theme` message for a new felt, the module renders that palette's presets the same way. Until each one is ready, the [fallbacks](#fallbacks) apply.

### 3. The first tap

A one-time `pointerdown` listener runs on the first tap anywhere on the page. If Sound isn't Off, it creates or resumes the playing `AudioContext`. A change of the Sound setting is itself a tap, so it does the same.

### 4. When a batch arrives

1. The [gates](#gates) run. A batch that fails one is dropped.
2. Unknown types and fields are ignored.
3. The batch is added to the memory, and any pattern it completes adds a [derived event](#derived-events).
4. The [rule table](#rule-table) picks the main cue: the first match in rank order.
5. The module works out the [stakes](#stakes) and applies [escalation](#escalation) and [novelty](#novelty).
6. It picks at most one [layer](#layering).
7. It picks each part's [variant](#variants) and works out the [parameters](#parameters).
8. Each channel takes its part. The [dropping](#dropping) checks run, and a part that passes plays once:
   - **Vibration:** `navigator.vibrate(pattern)`.
   - **Sound:** a buffer source, through a gain node (Half or Full), started on `audioContext.currentTime`.
   - **Event parallax:** as #185 defines.
9. Each channel records the time and rank, for its next gap check.

### 5. Settings changes

| Change | What happens |
|---|---|
| Sound to Off | The module cancels, then suspends the playing `AudioContext`. Loaded sounds stay in memory for the page load. |
| Sound from Off to Half or Full | Loading starts if it hasn't, and the playing `AudioContext` is created or resumed. |
| Vibration off | `navigator.vibrate(0)` stops a pattern that is running. |
| `reset` message | All three settings go to Off, with the effects above. |
| `theme` message | The module switches palette and renders the new presets at idle. |
| `speed` message, Instant | The module cancels and stops a running pattern or motion. |

## Code

- One file, `feedback/feedback.js`: no build step and no dependencies. It reads nothing from the game except batches and control messages.
- Named constants: the rule table, the cue table, the derived-event patterns, and the values in [Constants](#constants).
- `derive(memory, batch)`: a pure function from the memory and a new batch to the derived events it completes.
- `cueFor(batch, memory)`: a pure function from a batch to its main cue, its layer and each part's variant and parameters.
- It checks its [gates](#gates), applies the [dropping](#dropping) rules, and plays.
- It builds and handles the rows in `#setFeedback`, and keeps its own device keys.
- `feedback/synth.js`: `render(preset, params)` returns a promise of an audio buffer. Pure apart from Web Audio: the same preset gives the same sound.
- `feedback/palettes.js`: the presets, as data, grouped by palette. No code.
- Elsewhere: `sw.js` precaches the three files, `tools/publish.sh` publishes them, and `README.md` describes it as an optional add-on to the one-file game. The game's code is in the [Feedback contract](feedback-contract.md#code-in-indexhtml).

## Constants

All draft values, to tune once built.

| Constant | Draft value | Meaning |
|---|---|---|
| `LATE_MS` | 80 | How late a part may be and still play |
| `GAP_VIBRATE_MS` | 150 | The minimum time between two vibrations. A card pick ignores it. |
| `GAP_SOUND_MS` | 60 | The minimum time between two sounds |
| `MAX_VOICES` | 4 | The most sounds that play at once |
| `HALF_GAIN` | 0.5 | The volume for Half |
| `VIBRATE_MAX_MS` | 300 | The longest single pulse after scaling |
| `VIBRATE_TOTAL_MS` | 1500 | The longest whole pattern after scaling |
| `STAKES_CLOSE` | 7 | The score that makes the stakes Close |
| `STAKES_MATCH` | 9 | The score that makes the stakes Match point: one below the winning score |
| `NOVELTY_HANDS` | 3 | How many hands a special cue waits before it can repeat its version |
| `RENDER_BUDGET_MS` | 150 | The most time one preset's render may take on a mid-range phone. A slower preset is a design problem to fix in the lab. |
| `MEMORY_MAX` | 1000 | The most moments the module remembers. A hand sends about 35; check against the longest games in `gamelength.js`. |

## Tests

| Change | Tier | Scripts |
|---|---|---|
| `feedback/feedback.js` | T1 | A new `tests/feedback.js` script: rule ranks, cue parts, seat rules, the gates, and dropping with a fake clock and stubbed `navigator.vibrate` and `AudioContext`. `typecheck.js` checks the file too. |
| Derived events | T1 | `tests/feedback.js`: each pattern completes on the right sequence and not on a near miss; a gap breaks it; the memory clears on `cancel` with `scope: 'game'`; a derived event never spawns another |
| Variety | T1 | `tests/feedback.js`: the same batch gives the same variant every time; stakes from scores; escalation picks the right entry and never adds a channel that's off; novelty rotates, then falls back; at most one layer, never on a channel the main cue uses; parameters clamp, fall back on a bad value and never turn a channel on |
| Sounds | T1 | `tests/feedback.js` with a fake synth: the fallbacks in order (palette, Classic, ordinary cue, nothing); Showdown versions from `showdownCalled` to `showdownScored`; a `theme` message switches palette; a missing `synth.js` or a failed render shows nothing and leaves the other parts playing |
| `feedback/synth.js` | T1 | `tests/feedback.js`, in the browser: every preset in `palettes.js` renders, isn't silent, stays within its target length and `RENDER_BUDGET_MS`, and renders the same samples twice. The lab's own self-test checks are the model. |
| Caching | T1 | `sw.js`: the three feedback files are precached apart from `ASSETS`, including an install where one fails |
| Reset this tab | T1 | `resets.js` |
| On a phone | By hand, once | Vibration patterns on Android, rendering time against `RENDER_BUDGET_MS`, and whether sound adds any delay at Fast |

The game's side has its own tests, in the [Feedback contract](feedback-contract.md#tests). `CLAUDE.md` and `tests/README.md` list the new script.

## Decisions

The current decisions. Their history is in the commit log.

| Area | Decision |
|---|---|
| **Architecture** | An optional, external module in `feedback/`, separate from the game. The game sends moments and never depends on a reply. See the [Feedback contract](feedback-contract.md). |
| **Channels** | Vibration (Android only, no iPhone workarounds), sound, and event parallax. Each plays its part on its own. |
| **Settings** | Vibration (switch), Sound (Off, Half or Full) and Sound in replays (switch), all off by default, kept on the device, reset by Reset this tab |
| **Cues** | A rule table for when (first match wins) and a cue table for what, with a column for each channel |
| **Ordinary cues** | No your-turn cue. A bot's King point and trick get sound only. No vibration for a hand result. While you mediate, only the Showdown's end and Skip ▶ vibrate. Autoplay counts as you. No sound for a pass, a void hand, a refused move or buttons. |
| **Taps** | Picking a card vibrates, with no sound |
| **Speed Instant** | Turns off vibration, sound and parallax, event and common, with no override |
| **Replay viewer** | No vibration. Sound only with Sound in replays on. |
| **Sounds** | Made at run time by `feedback/synth.js`, the Card Sound Lab's synthesis core, from presets (family, archetype, seed) in `feedback/palettes.js`, rendered when the browser is idle while Sound isn't Off, silent when missing, precached with the module |
| **Result sounds** | A ninth, tonal family, `result`: a card knock that resolves into tones, with 4 archetypes, a key per palette, and lengths up to 2.5 s |
| **Theme palettes** | Each felt has a palette. Classic is the base; the others override preset by preset. A palette can have a Showdown voice. Sound follows the felt, with no setting. |
| **Moments of interest** | Rare situations with their own rule above the ordinary one, measured before they get a cue, falling back to the ordinary sound until their file exists |
| **Derived events** | `derived:` events from patterns in a short, public-only memory of the current game |
| **Variety** | Stakes from public scores; variants picked by a hash, with no RNG or seed; escalation by stakes and counts; novelty per game; at most one layer; parameters that are clamped and pure |
| **Parallax** | Event parallax is a channel of the module. Common parallax lives outside it and ignores moments. |

## Open items

| Item | Where it gets settled |
|---|---|
| The lead-change cases marked **Open** | [Lead change](#lead-change), before that cue is built |
| The comeback size and the streak length | [Candidates](#candidates), by measuring |
| Whether playing a card in your hand vibrates on Android, like picking one | A rule row and a cue row |
| The parallax motions, their settings, their dropping rule and their timing with `Fx` | #185's spec |
| The `result` family's base settings, and each palette's key and partials | Building the family in the lab |
| Rendering time on a real phone | Measuring once `synth.js` exists |
| Each palette's character and which presets it overrides | Designing the palettes in the artifact |
| Whether the seed picks an optional extra for each game, within the palette | A later decision: a 3-bit value from the game, never the seed |
| Every value in [Constants](#constants) | Tuning, once built |
