# Replay code specification

Format version: **2**. Code: `Replay` in `index.html` (section 4b).

## 1. Purpose

A replay code is one line of text that holds one full game of King Cut-Throat. With the code, the app can make the same game again, step by step.

The seed alone cannot do this. The seed is a 32-bit number. It sets the shuffles, the first dealer and (in Free play) the two bots. It does not contain the decisions of the players. A replay code contains the seed **and** each decision.

## 2. Terms

| Term | Meaning |
|---|---|
| Seat | 0 = You (South), 1 = West, 2 = East. |
| Decision | An action that a player chooses: DISCARD, BID, NAME, EXCHANGE, PLAY, SHOWDOWN_DISCARD. |
| System step | An action that the state sets: START_GAME, DEAL, FLIP, ADVANCE. A code does not contain system steps. |
| Record | The decoded code, as a JavaScript object (section 7). |
| uint | An unsigned LEB128 varint: 7 bits for each byte, low bits first, bit 7 = "more bytes follow". |
| text | A uint length, then that number of UTF-8 bytes. |
| blob | A uint length, then that number of bytes. |
| card | One byte: the index of the card in `Rules.ALL_IDS` (section 6). |

## 3. Text form

```
KCT<version>-<payload>
```

- `<version>` is the format version in decimal. This spec is version `2`.
- `<payload>` is base64url (RFC 4648, section 5) with no `=` padding.
- Example: `KCT2-AgEFAZIhAgMCCQADdmV4A2RvYwPTAgAYCAM…` (seed 4242, wave 3, Vex and Doc)

## 4. Byte layout

```
uint   format version (2)
then 1 or more sections:
  uint   tag
  uint   length of the payload, in bytes
  bytes  payload
```

### 4.1 Section rules

1. The sections must be in increasing tag order. Each tag can occur only one time.
2. **An odd tag is required.** If a reader does not know an odd tag, it must refuse the code. Use an odd tag for data that changes the game, or for data that a reader must not ignore.
3. **An even tag is optional.** If a reader does not know an even tag, it must skip the section by its length. A writer that re-encodes a record must keep the unknown sections without changes (the record holds them in `unknown`).
4. GAME (1) and DECISIONS (3) must be present. All other sections are optional.
5. Inside a known section, a reader must read only the fields that it knows. If a later version adds fields to the end of a known section, an older reader ignores them, because it reads by the section length.

### 4.2 Sections in version 2

| Tag | Name | Required | Payload |
|---|---|---|---|
| 1 | GAME | yes | `uint rules`, `uint seed`, `uint mode`, `uint wave` |
| 2 | SEATS | no | 3 × `text` persona id (You, West, East). Empty text = no persona. |
| 3 | DECISIONS | yes | Decision entries to the end of the section (section 5). |
| 4 | RESULT | no | `uint finished` (0/1), `uint winner` (seat + 1, 0 = none), `uint hands`, 3 × `uint score` |
| 6 | FLAGS | no | `uint` bit field (section 4.3). |
| 8 | TIME | no | `uint` end time of the game, in Unix seconds. |
| 10 | META | no | Generic variables (section 4.4). |

GAME fields:

- **rules**: `Engine.RULES_VERSION`. Developers raise this number when a change makes the same seed and decisions give a different game (a rule, the deal or the RNG). A reader must not replay a code with another rules version.
- **seed**: the 32-bit game seed.
- **mode**: 0 = not known, 1 = Free play (`free`), 2 = Waves (`waves`). A later version can add more values. A reader shows an unknown value as `mode<n>`.
- **wave**: the wave number, or 0 for no wave.

RESULT: a replay must reach the same winner and the same scores. If it does not, the replay fails.

### 4.3 Flags

| Bit | Name | Meaning |
|---|---|---|
| 0 (value 1) | assisted | The AI played your seat during some or all of the game. |
| 1 and up | — | Reserved. A reader keeps unknown bits in `flags.bits` and writes them again. |

### 4.4 META: generic variables

Use META for new facts that do not change the game. You do not need a new tag or a new format version for them.

```
uint count
then count entries, in key order (sorted):
  text  key
  uint  value type
  value
```

| Type | Name | Value |
|---|---|---|
| 0 | INT | `uint` (0 or more, a safe integer) |
| 1 | TEXT | `text` |
| 2 | BYTES | `blob` |
| 3 | BOOL | `uint` 0 or 1 |
| 4 and up | — | Reserved. A reader must refuse an unknown type, because it cannot find the end of the value. |

Key rules:

- Use dotted, lower-case names: `area.name`, for example `ai.tier`.
- The `x.` prefix is for tests and private use. The app never gives a meaning to `x.` keys.
- A reader ignores keys that it does not know.

Keys that the app writes now:

| Key | Type | Meaning |
|---|---|---|
| `ai.tier` | TEXT | AI skill tier: `novice`, `casual`, `club` or `shark`. `custom` when the settings match no tier. |
| `ai.courage` | TEXT | AI courage: `timid`, `cautious`, `normal` or `bold`. |
| `ai.realTable` | BOOL | Real-table bots were on. |
| `ai.hunches` | INT | Hunches: guessed deals for each decision (1–200). |
| `ai.brainFarts` | INT | Brain farts, in percent (0–100). |
| `ai.know.bids` | BOOL | Knowledge switch: reads bids. |
| `ai.know.turnedCard` | BOOL | Knowledge switch: tracks the turned card. |
| `ai.know.ownDiscards` | BOOL | Knowledge switch: remembers its discards. |
| `ai.know.voids` | BOOL | Knowledge switch: spots voids. |
| `ai.know.scoreAware` | BOOL | Knowledge switch: watches the score. |
| `ai.know.showdownPlans` | BOOL | Knowledge switch: plans showdowns. |
| `ai.personas` | BOOL | At least one bot move used the bot's personality. Its settings follow from its id in SEATS. |
| `ai.changed` | BOOL | The bots used more than one set of Settings-panel values in this game. |

The `ai.tier` to `ai.know.*` keys hold the Settings-panel values that a bot used, so you can see the settings also when `ai.tier` is `custom`. They are written only when a bot played with the panel values (Personalities off, in Free play). If the values changed during the game, the code holds the last values that a bot used, and `ai.changed` is true. A game in which every bot played as its personality has only `ai.personas`. The app writes a key only when it is true or has a value.

These keys are for information only. The AI moves are already in DECISIONS, so a replay does not need them.

## 5. Decision entries

Each entry starts with one header byte:

```
bits 7..2  type
bits 1..0  seat (0, 1, 2; 3 = no seat)
```

| Type | Name | Data after the header |
|---|---|---|
| 0 | DISCARD | 3 × card |
| 1 | BID | 1 byte: 1 = accept, 0 = pass |
| 2 | NAME | 1 byte: 0 = pass, 1–4 = suit S, H, D, C |
| 3 | EXCHANGE | `uint` count, then that number of cards |
| 4 | PLAY | card |
| 5 | SHOWDOWN_DISCARD | card |
| 6 | MARK | `uint` kind, `blob` data |
| 7 | EXT | `uint` kind, `blob` data |
| 8–63 | — | Reserved for new decision types in a later format version. |

Types 0–5 must use a seat from 0 to 2. They go to `Engine.dispatch` in the order of the list. The replay adds the system steps between them.

### 5.1 MARK: notes in the stream

A MARK records an event at a position in the game, but it does not change the game. Examples for a later version: "the AI took your seat here", "the player used a hint", a time stamp.

- A replay skips MARK entries.
- A reader keeps all MARK entries, also when it does not know their kind.
- Seat 3 means that the note is not about one seat.
- Kinds are not assigned yet. Kinds 0–63 are for the app. Kinds 64 and up are for tests and private use.

### 5.2 EXT: future decisions

An EXT entry is a decision that changes the game, from a later version of the rules. The current app cannot apply an EXT entry. A replay stops at it with an error. A decoder still reads it (`kind`, `data`), so the app can show the code's data.

## 6. Card index

`Rules.ALL_IDS` order: the suits S, H, D, C, each with the ranks 7, 8, 9, 10, J, Q, K, A, then the Joker.

| Index | Cards |
|---|---|
| 0–7 | 7S 8S 9S 10S JS QS KS AS |
| 8–15 | 7H 8H 9H 10H JH QH KH AH |
| 16–23 | 7D 8D 9D 10D JD QD KD AD |
| 24–31 | 7C 8C 9C 10C JC QC KC AC |
| 32 | JK |

If the deck changes, raise `Engine.RULES_VERSION`.

## 7. Record object

`Replay.decode(code)` and `Replay.fromState(state, meta)` give this object:

```js
{
  v: 2,                       // format version of the code (1 for a KCT1 code)
  rules: 1,                   // Engine.RULES_VERSION
  seed: 4242,
  mode: 'waves',              // 'free', 'waves', null, or 'mode<n>'
  wave: 3,                    // or null
  seats: [null, 'vex', 'doc'],
  decisions: [
    { type: 'DISCARD', player: 0, cards: ['7C', '7H', '10S'] },
    { type: 'BID', player: 2, accept: false },
    { type: 'NAME', player: 1, suit: null },
    { type: 'EXCHANGE', player: 1, cards: ['10C'] },
    { type: 'PLAY', player: 2, card: 'JC' },
    { type: 'MARK', player: null, kind: 9, data: [7] }
    // …
  ],
  result: { finished: true, winner: 1, scores: [1, 10, 4], hands: 6 },  // or null
  flags: { assisted: false },  // plus bits: <n> for unknown bits
  endedAt: 1790000000000,      // ms, or null (stored in whole seconds)
  meta: { 'ai.tier': 'casual' },
  unknown: [{ tag: 12, data: [1, 2, 3] }]   // optional sections that this app does not know
}
```

## 8. Replay procedure

1. Decode the code. Refuse it if the version is newer, a required section is unknown, or the bytes stop early.
2. Refuse it if `rules` is not `Engine.RULES_VERSION`.
3. `state = Engine.createGame(seed, names)`.
4. Repeat until the game ends:
   - If `Engine.systemAction(state)` gives an action, dispatch it.
   - If not, skip MARK entries and dispatch the next decision. If there is no next decision, stop (an unfinished game). If the next entry is EXT, stop with an error.
   - If the Engine refuses an action, stop with an error.
5. Fail if decisions (not MARKs) remain after the game ends.
6. Fail if RESULT says the game finished and the end is not the same.

`Replay.cursor(code)` does step 4 one action at a time. `seek(n)` goes to step `n`. To go back, it starts again from the seed.

## 9. Version 1 codes

The app also reads `KCT1-` codes (the first release). Layout: `1`, seed (4 bytes, big-endian), wave (1 byte), West and East ids (1 length byte + ASCII each), then decision entries with no section around them (EXCHANGE has a 1-byte count). A version 1 code has rules version 1, `mode` from the wave, and no result, flags, time or meta. The app writes only version 2 codes.

## 10. How to add data in a later version

| What you add | Where |
|---|---|
| A fact about the game that a replay does not need (an app build, a device, a player name) | A META key. No version change. |
| A group of related optional data | A new **even** tag. No version change. |
| Data that a reader must understand | A new **odd** tag. Old readers refuse the code, as they must. |
| A note at a point in the game | A MARK kind. No version change. |
| A new kind of player decision | An EXT kind now, or a new type (8–63) with a new format version. |
| A rule change that changes the game for the same decisions | Raise `Engine.RULES_VERSION`. |
| A change to the layout of section 4 itself | Raise the format version (`KCT3-`). Keep a reader for the old versions. |

## 11. Size and limits

### 11.1 Capacity requirement

The format must hold a game of **at least 20 hands in which each hand is a showdown**, with the longest bidding and a 2-card exchange. Real games are shorter, but this is the safe limit. The self-test `replay` encodes and decodes this worst case and checks that the code is 3,000 characters or less, also with the full AI settings in META.

The format itself has no hard limit. Section lengths and counts are `uint` varints. `Replay.run` and `Replay.cursor` have no step limit.

### 11.2 Decisions and bytes for each hand

| Hand | Decisions | Bytes |
|---|---|---|
| Joker turned (void) | 3 | 12 |
| All players pass in both rounds (abandoned) | 9 | 24 |
| Normal, 1 bid, 1-card exchange | 26 | 59 |
| Normal, longest bidding (6), 2-card exchange | 31 | 70 |
| Showdown, longest bidding, 2-card exchange | 43 | 94 |

Bytes: DISCARD = 4, BID or NAME = 2, EXCHANGE = 2 + number of cards, PLAY or SHOWDOWN_DISCARD = 2. A showdown adds 2 SHOWDOWN_DISCARD and 10 PLAY (5 tricks × 2 players) to a normal hand. The last hand can be shorter, because a King can give the tenth point before the last trick.

### 11.3 Code length

The other sections (GAME, SEATS, RESULT, FLAGS, TIME, META) use about 220 bytes. The full AI settings in META use about 190 of these bytes. Base64url makes 4 characters from each 3 bytes.

| Game | Decisions | Characters |
|---|---|---|
| Short game, about 8 hands | about 220 | about 950 |
| Long game, 15 hands, 3 showdowns (seed 830) | 476 | about 1,770 |
| 20 hands, typical | about 540–600 | about 1,900–2,200 |
| 20 hands, all showdowns (worst case, section 11.1) | 860 | about 2,850 |

### 11.4 Other limits

- The app keeps the codes of the last 20 finished games in `localStorage` (`kct.replays`). In the worst case, this is about 57 KB.
- A game resumed from a save made before replay codes existed has no decision list, so it has no code.
