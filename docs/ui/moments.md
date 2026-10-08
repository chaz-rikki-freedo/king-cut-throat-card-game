# Game moments

A *game moment* is one step of a hand, as the player sees it. Each moment has a name, an Engine phase (`Engine.P`), and its own content in the action bar. The UI levels change the text of each moment, so a design note names the moment and the part, for example "Round 1 bid · hint".

## Moments

| Moment | Engine phase | Status line (S) | What you do |
|---|---|---|---|
| No game | `setup` | "No game is running." | Open the menu: **Choose a game**. |
| Deal | `handStart` | "Hand 2 · West deals." | Nothing. |
| Opening discard | `discard` | "West is discarding 3 cards face-down to the outside pile." (in turn from the dealer's left; "Your turn to discard…" on yours) | Pick 3 cards, then **Discard 3**. |
| Seat swap | `discard`, hand 1, Free play | — | The seat-swap dialog opens before the opening discard. |
| Turn-up | `reveal` | "East turns up the top kitty card…" | Nothing. |
| Round 1 bid | `bid1` | "Round 1 · Your call on Spades." | **Accept ♠** or **Pass**. |
| Round 2 bid | `bid2` | "Round 2 · Your call. Spades is blocked." | A suit button or **Pass**. |
| Kitty exchange | `exchange` | "West (left of the namer) takes the kitty card and discards 1." | If you are the Kitty player: pick 1 or 2 cards, then **Discard 1** or **Discard 2**. |
| Trick play | `trickPlay` | "Your turn." or "West is playing…" | Lead or play a playable card. |
| Trick end | `trickDone` | "West wins the trick with K♠ — +1 King point!" | Nothing, or tap the center to skip the wait. |
| Hand result | `handScore` | — | **Next hand**. |
| Hand abandoned | `abandoned` | — | **Next deal**. |
| Joker void | `jokerVoid` | — | **Redeal**. |
| Showdown setup | `showdownSetup` | — | **Deal the Showdown**. |
| Showdown discard | `showdownDiscard` | "Showdown · each Showdown player discards 1 card." | Pick 1 card, then **Discard 1**. |
| Showdown play | `showdownPlay` | As in trick play. | As in trick play. The mediator watches, or uses **Skip ▶**. |
| Showdown trick end | `showdownTrickDone` | As in trick end. | As in trick end. |
| Showdown result | `showdownScore` | — | **Next hand**. |
| Game over | `gameOver` | "West wins the game!" | The game-over dialog and the end buttons. |

## Action bar text by moment

The prompt and the hint are the two text parts that the UI levels change the most.

| Moment | Prompt (I) | Hint (I or D) |
|---|---|---|
| No game | "No game is running." | — |
| Opening discard | "Choose 3 cards to discard face-down to the outside pile (2/3)." | "Trump is not known yet. The outside pile is used again only in a Showdown." |
| Round 1 bid | "Accept ♠ Spades as trump?" | "If you accept, the 9♠ goes to West (your left), who then discards 1. The other 2 kitty cards go to the outside pile." |
| Round 2 bid | "Round 2: name a trump suit or pass." | "If you name a suit, the 2 face-down kitty cards go to West (your left), who then discards 2." When you deal: "If you pass too, the hand is abandoned." |
| Kitty exchange | "East named ♥ Hearts. You receive 9♠. Discard 1 (0/1)." | — |
| Showdown discard | "Showdown: discard 1 of your 6 cards (0/1). Trump is ♥ Hearts." | — |
| Trick play, you lead | "Your turn: lead a card." | — |
| Trick play, you must follow | "Your turn: play a card." | "You must follow ♥ Hearts. Cards that you cannot play are disabled." |
| Trick play, you cannot follow | "Your turn: play a card." | "You have no Hearts: play any card." |
| Waiting | — | The status line, repeated. |
| Game over | "Game over — West wins." | — |

## Input outside the action bar

| Input | Effect |
|---|---|
| A click on the center | Skips the current wait (`skip`). |
| Space or Enter, with no dialog open | Skips the current wait, or presses the continue button. |
| Escape, with a confirm dialog open | Answers Cancel. |
| Space or Enter on the seat toggle | Hands your seat to the AI, or takes it back. |
