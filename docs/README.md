# Docs

A map of the design notes, specifications and wikis. For the game's rules and what has been measured so far, read [CLAUDE.md](../CLAUDE.md) in the repo root first. For the app's menus and settings, read the [main README](../README.md).

## Find an answer

| You want to know | Read |
|---|---|
| Is it worth naming trump, and when? | [naming-trump-cost.md](naming-trump-cost.md) |
| Where does the game ask for real choices? Is a Showdown worth forcing? | [strategic-depth.md](strategic-depth.md) |
| How do the bots differ from people, and how is bot strength measured? | [human-play.md](human-play.md) |
| What does a version number cover, and when do I change it? | [versions.md](versions.md) |
| How does a replay code or a backup file work? | [replay-code.md](replay-code.md), [backup.md](backup.md) |
| What is this part of the screen called? | [ui/README.md](ui/README.md) |
| Who are the opponents? | [characters.md](characters.md), [banter.md](banter.md) |
| How do I run or write a test? | [tests/README.md](../tests/README.md) |

## Design notes

Notes that record what we observed, what we think causes it, and what we measured. Each claim is labeled an *observation*, a *hypothesis* or a *measurement*.

- **[naming-trump-cost.md](naming-trump-cost.md).** What naming trump costs, by round and seat. Rules of thumb first, evidence below. Backed by a lookup model, `tests/data/naming-model.json`.
- **[strategic-depth.md](strategic-depth.md).** The four places the game has depth: the blind discard, the bid, the gift and the Showdown. Includes kingmaking.
- **[human-play.md](human-play.md).** How people play against the bots, the hand-value fit, and how Dynamic mode eases a bot.

## Specifications

- **[replay-code.md](replay-code.md).** The replay code format.
- **[backup.md](backup.md).** The backup file format.
- **[versions.md](versions.md).** Every version number the app uses.

## Reference

- **[ui/](ui/README.md).** The UI wiki: names for every area of the interface, plus colors and moments.
- **[characters.md](characters.md).** A background for each of the ten opponents.
- **[banter.md](banter.md).** The lines each opponent says.

## Writing a note

- Start with a plain summary a newcomer can read in a minute, then the evidence.
- Label every claim *observation*, *hypothesis* or *measurement*. Give the sample and the margin with every number.
- Say which scale a number is on. The game has two hand-value scales (see [CLAUDE.md](../CLAUDE.md)).
- When a later result corrects an earlier note, fix the note and say what changed.
