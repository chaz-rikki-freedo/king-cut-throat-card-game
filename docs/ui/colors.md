# Colors

This page is the color system of King Cut-Throat: which colors exist, what each one means, and the rules that keep them apart. Its goal is that no two colors with different meanings can be mistaken for each other, now or in a theme pack.

The system has three parts:

| Part | File | What it holds |
|---|---|---|
| Tokens | `index.html`, the `:root` block | The color values the game uses. Every rule draws its colors from a token (`var(--gold)`), not from a written value. |
| Registry | [`palette.json`](palette.json) | Every token with its family and job, the groups, the rules, the contrast pairs, the colors not yet tokens, and the known problems. |
| Checker | [`tests/palette.js`](../../tests/palette.js) | Checks the tokens against the registry and the rules. It runs in the Checks workflow on every pull request. |
| Palette page | [`palette.html`](palette.html) | For development only, never published: every token, the colors in context, the collision table and the problems, with color blindness simulated, and a box to try a theme pack. |

## The families

Each color belongs to one family, and each family has one job. A new color must fit one family.

| Family | Job | Rule |
|---|---|---|
| **surface** | What things sit on: the page, the felt, the panels. | |
| **text** | Words on dark surfaces. | |
| **action** | Act here, or important now: gold buttons, the turn, trump; the selection outline. | Never a label, a mode or a name. |
| **status** | How something went: a loss, a gain, an error. | |
| **card** | Card faces and suits. Red suits have one color on a card face and one on dark surfaces. | |
| **seat** | Which seat: you, West, East. | When a bot sits down, its bot color replaces the West or East seat color. |
| **mode** | Which game: Free play, Dynamic, Waves. | Always a chip: a fill with its own ink. Never colored text. |
| **bot** | Which personality. | Always colored text next to the name. Never a chip. |
| **settings** | The Settings panel's own surfaces. | |

**Never by color alone.** Every color-coded thing also shows its name, its form (chip or text) or its place. This is what lets a mode chip and a bot name share a hue without being confused, and what keeps the game usable with color blindness.

## How different is different enough

The checker measures how different two colors look with CIEDE2000, a measure built from how people see color. The rules are written in four levels of what a player can tell apart:

| Level | What a player sees | Measure |
|---|---|---|
| **Identical** | Cannot tell them apart, even side by side. | under 3 |
| **Lookalike** | Different only side by side; apart, they read as one color. | 3 to 10 |
| **Similar** | Told apart at a glance, though small text in a list can mislead. | 10 to 20 |
| **Distinct** | Recognized alone, anywhere. | 20 and over |

## The rules

| Rule | Between | At least | Why |
|---|---|---|---|
| `people` | You and the ten bots | similar | Any two bots can share a table, and all ten share a list in Your profile. |
| `seats` | You, West and East with no personality seated | similar | |
| `modes` | The three mode chips | similar | They share the menu and the game history. |
| `people-signals` | You and the bots, against gold, the selection, red suits, loss and gain | similar | Names sit next to these on the table and in the log. |
| `seats-signals` | The seats, against the same signals | similar | |
| `modes-signals` | The mode chips, against the same signals | similar | A chip is a fill, like a gold button. |
| `modes-people` | The mode chips, against you and the bots | lookalike | A chip and a name differ in form, so only identical colors collide. |

**Color blindness.** Red-green color blindness affects about 1 in 12 men and 1 in 200 women. Every rule is checked again with its two strongest forms simulated, deuteranopia and protanopia. There, no pair may be identical: names are always printed, so lookalike is enough. Tritanopia (blue-yellow) is rare and is not checked by default; the checker can simulate it.

**Contrast.** Text must reach the WCAG contrast ratio against what it sits on: 4.5:1 for words, 3:1 for suit symbols. The registry lists each text and background pair. A background such as `--panel@--felt` is a tint over the felt, the real background of the seats and the log.

## Run the checker

```sh
cd tests
node palette.js                  # check the game's colors
node palette.js --write-doc      # rewrite the generated tables on this page from palette.json
node palette.js --pack pack.json # check a theme pack
```

To see the colors, serve the repository root and open the palette page. It uses the checker's own code, so it shows the same results:

```sh
python3 -m http.server          # from the repository root
# then open http://localhost:8000/docs/ui/palette.html
```

The checker fails when:

- a token in `index.html` is not in the registry, or has another value there;
- a color is written in `index.html` outside a token and is not on the untokenized list;
- a rule or a contrast pair fails, and the pair is not on the known list;
- a known pair passes now, or an untokenized color is gone, and the registry still lists it;
- the tables on this page do not match the registry.

## Add or change a color

1. Reuse a token when one has the job. If none has, add a token to `:root` in `index.html`.
2. Add the token to `palette.json`, with its family and its job. If it is a name, a mode or a signal, add it to its group.
3. Run `node palette.js`. A new collision fails: choose another value, not a new known entry.
4. Run `node palette.js --write-doc` and commit this page with the change.

Do not add to the known list or the untokenized list. They record the state when the system started, and only shrink.

## Theme packs

A theme pack gives new values to tokens. The game's packs are JSON in the head of `index.html` (`#themePacks`), in two kinds:

```json
{ "felts": { "winter": { "name": "Winter", "tokens": { "--felt": "#2d4560", … } }, … },
  "colors": { "colorblind": { "name": "Color-blind safe", "tokens": { "--bot-vex": "#fe7f9d", … } } } }
```

| Kind | Sets | In Settings | Check |
|---|---|---|---|
| **Felt** | Surfaces: `--page`, `--felt`, `--felt-edge`, the Showdown felt, `--sheet`, `--muted`, and the Settings surfaces (`--set-*`). | **Felt** tiles: Classic (no tokens: the defaults), Spring, Summer, Fall, Winter. | A felt may keep a known problem of the defaults only when it changes neither color of the pair. Every contrast pair must pass on its surfaces. |
| **Color** | Names, mode chips, the selection. | **Color-blind safe colors**, over any felt. | Strict: with each felt, no problem at all, known or not. |

`node palette.js` checks every felt alone and every felt with every color pack, and fails on a token that does not exist or a value that is not a color. The pack colors are not stray colors. A small script in the head (`#themeBoot`) applies the saved packs before the page draws: it sets each token on `:root` and `<meta name="theme-color">` to the felt edge.

`node palette.js --pack pack.json` checks a pack file the same way (`"strict": true` for a color pack). A pack can change only tokens, so a color still on the untokenized list keeps its value under every pack.

## Tokens

Generated from `palette.json`.

<!-- palette:tokens -->
| Token | Family | Default | Job |
|---|---|---|---|
| `--page` | surface | `#0a2a19` | The page behind the table, and the browser theme color. |
| `--felt` | surface | `#155a36` | The table felt. |
| `--felt-edge` | surface | `#0c3a22` | The felt border and the seats. |
| `--felt-showdown` | surface | `#5a1f45` | The felt during a Showdown. |
| `--felt-showdown-edge` | surface | `#3a1230` | The felt border during a Showdown. |
| `--panel` | surface | `rgba(0,0,0,.26)` | A dark tint over the felt: chips, boxes and seats. |
| `--panel-strong` | surface | `rgba(0,0,0,.42)` | A stronger tint over the felt: the trump chip. |
| `--sheet` | surface | `#123f28` | The background of every panel: Your profile, the pop-ups and the questions. |
| `--ink` | text | `#f5f2e9` | Main text on dark surfaces. |
| `--muted` | text | `#bccbbf` | Secondary text on dark surfaces. |
| `--gold` | action | `#f2c14e` | Act here, or important now: primary buttons, the selected tab, trump, the caller, the turn, the trick winner. |
| `--gold-ink` | action | `#3a2a00` | Text on gold. |
| `--accent` | action | `#7cc4ff` | Selection: the selected and playable cards, the lead mark, trump in the log. |
| `--mine` | action | `#8ff59a` | Your own cards in a popup card list (Trump, Kings): the tint of the chip. |
| `--danger` | status | `#ff8a80` | Something went wrong, or a loss. |
| `--good` | status | `#9be59b` | Something worked, or a gain. |
| `--card` | card | `#fffdf6` | The face of a card. |
| `--card-edge` | card | `#d6cfbd` | The edge of a card. |
| `--red` | card | `#c62828` | Red suits on a card face. |
| `--black` | card | `#1c1c1e` | Black suits on a card face, and text on light surfaces. |
| `--pip-red` | card | `#ff6b6b` | Red suits on dark surfaces: the trump chip, the log, the Advanced panels. |
| `--award0` | status | `#ff1744` | Award band 0 of 0-6 (neon red: the worst), the stroke of the game-over box while awards are on (a dev feature). The 7 are evenly spaced to the eye. |
| `--award1` | status | `#ff5d1f` | Award band 1 of 0-6 (red-orange), the stroke of the game-over box while awards are on (a dev feature). The 7 are evenly spaced to the eye. |
| `--award2` | status | `#ff9200` | Award band 2 of 0-6 (orange), the stroke of the game-over box while awards are on (a dev feature). The 7 are evenly spaced to the eye. |
| `--award3` | status | `#ffc600` | Award band 3 of 0-6 (gold: a bot's usual game), the stroke of the game-over box while awards are on (a dev feature). The 7 are evenly spaced to the eye. |
| `--award4` | status | `#eaf200` | Award band 4 of 0-6 (lemon), the stroke of the game-over box while awards are on (a dev feature). The 7 are evenly spaced to the eye. |
| `--award5` | status | `#79ff03` | Award band 5 of 0-6 (green), the stroke of the game-over box while awards are on (a dev feature). The 7 are evenly spaced to the eye. |
| `--award6` | status | `#00e676` | Award band 6 of 0-6 (emerald neon green: the best), the stroke of the game-over box while awards are on (a dev feature). The 7 are evenly spaced to the eye. |
| `--name0` | seat | `#5eead4` | You: your seat, your name, and your wins in the chart. |
| `--name1` | seat | `#a3e635` | West, with no personality seated. A seated bot replaces it with its own --bot color. |
| `--name2` | seat | `#a5b4fc` | East, with no personality seated. A seated bot replaces it with its own --bot color. |
| `--mode-free` | mode | `#7cc4ff` | The Free play chip. |
| `--mode-free-ink` | mode | `#07233a` | Text on the Free play chip. |
| `--mode-dynamic` | mode | `#b9a3ff` | The Dynamic chip. |
| `--mode-dynamic-ink` | mode | `#1c1240` | Text on the Dynamic chip. |
| `--mode-waves` | mode | `#0e7490` | The Waves chip. |
| `--mode-waves-ink` | mode | `#ecfeff` | Text on the Waves chip. |
| `--bot-vex` | bot | `#ff7a7a` | Vex's name, wherever it shows. |
| `--bot-doc` | bot | `#9db0ff` | Doc's name, wherever it shows. |
| `--bot-ace` | bot | `#5fdc8f` | Ace's name, wherever it shows. |
| `--bot-mei` | bot | `#ff9fd0` | Mei's name, wherever it shows. |
| `--bot-gus` | bot | `#5cb8ff` | Gus's name, wherever it shows. |
| `--bot-lou` | bot | `#ffad5c` | Lou's name, wherever it shows. |
| `--bot-viv` | bot | `#c99bff` | Viv's name, wherever it shows. |
| `--bot-tex` | bot | `#d9a874` | Tex's name, wherever it shows. |
| `--bot-kit` | bot | `#d8e45a` | Kit's name, wherever it shows. |
| `--bot-zen` | bot | `#cfd8dc` | Zen's name, wherever it shows. |
| `--set-bg` | settings | `#0b0f0c` | The Settings panel background. |
| `--set-card` | settings | `#111b15` | A Settings card. |
| `--set-line` | settings | `#24382c` | Lines in Settings. |
| `--set-field` | settings | `#16261d` | Fields and the tab row in Settings. |
| `--set-hint` | settings | `#8fb89a` | Hint text in Settings. |
| `--set-switch` | settings | `#2f4337` | A switch that is off, in Settings. |
| `--set-switch-edge` | settings | `#3d5747` | The edge of a switch that is off, in Settings. |
<!-- /palette:tokens -->

## Known problems

The pairs that fail today, each with its planned fix. Generated from `palette.json`.

<!-- palette:known -->
| Check | Pair | Vision | Planned fix |
|---|---|---|---|
| people | `--bot-lou` / `--bot-tex` | normal | Recolor Tex: it is a lookalike of Lou. |
| people | `--bot-zen` / `--name0` | deuteranopia | Color-blind pass: set these apart by lightness, not hue alone. |
| people | `--bot-doc` / `--bot-gus` | deuteranopia | Color-blind pass: set these apart by lightness, not hue alone. |
| people | `--bot-doc` / `--bot-viv` | deuteranopia | Color-blind pass: set these apart by lightness, not hue alone. |
| people | `--bot-gus` / `--bot-viv` | deuteranopia | Color-blind pass: set these apart by lightness, not hue alone. |
| people | `--bot-doc` / `--bot-gus` | protanopia | Color-blind pass: set these apart by lightness, not hue alone. |
| modes | `--mode-dynamic` / `--mode-free` | deuteranopia | Color-blind pass: set these apart by lightness, not hue alone. |
| people-signals | `--bot-vex` / `--pip-red` | normal | Recolor Vex away from red: red means hearts, diamonds and errors. |
| people-signals | `--bot-vex` / `--danger` | normal | Recolor Vex away from red: red means hearts, diamonds and errors. |
| people-signals | `--bot-ace` / `--good` | normal | Recolor Ace away from the success green. |
| people-signals | `--accent` / `--bot-gus` | normal | Fixed with --accent / --mode-free. |
| people-signals | `--bot-vex` / `--pip-red` | deuteranopia | Color-blind pass: set these apart by lightness, not hue alone. |
| people-signals | `--bot-vex` / `--danger` | deuteranopia | Color-blind pass: set these apart by lightness, not hue alone. |
| people-signals | `--accent` / `--bot-doc` | deuteranopia | Color-blind pass: set these apart by lightness, not hue alone. |
| people-signals | `--bot-lou` / `--gold` | deuteranopia | Color-blind pass: set these apart by lightness, not hue alone. |
| people-signals | `--accent` / `--bot-viv` | deuteranopia | Color-blind pass: set these apart by lightness, not hue alone. |
| people-signals | `--bot-tex` / `--danger` | deuteranopia | Color-blind pass: set these apart by lightness, not hue alone. |
| people-signals | `--bot-ace` / `--good` | protanopia | Color-blind pass: set these apart by lightness, not hue alone. |
| seats-signals | `--gold` / `--name1` | deuteranopia | Color-blind pass: set these apart by lightness, not hue alone. |
| seats-signals | `--accent` / `--name2` | deuteranopia | Color-blind pass: set these apart by lightness, not hue alone. |
| seats-signals | `--accent` / `--name2` | protanopia | Color-blind pass: set these apart by lightness, not hue alone. |
| modes-signals | `--accent` / `--mode-free` | normal | Give the selection (--accent) its own color: today it is the Free play color. |
| modes-signals | `--accent` / `--mode-free` | deuteranopia | Color-blind pass: set these apart by lightness, not hue alone. |
| modes-signals | `--accent` / `--mode-dynamic` | deuteranopia | Color-blind pass: set these apart by lightness, not hue alone. |
| modes-signals | `--accent` / `--mode-free` | protanopia | Color-blind pass: set these apart by lightness, not hue alone. |
| modes-people | `--bot-doc` / `--mode-free` | deuteranopia | Color-blind pass: set these apart by lightness, not hue alone. |
| modes-people | `--bot-viv` / `--mode-free` | deuteranopia | Color-blind pass: set these apart by lightness, not hue alone. |
| modes-people | `--bot-doc` / `--mode-dynamic` | deuteranopia | Color-blind pass: set these apart by lightness, not hue alone. |
| modes-people | `--bot-gus` / `--mode-dynamic` | deuteranopia | Color-blind pass: set these apart by lightness, not hue alone. |
| modes-people | `--bot-viv` / `--mode-dynamic` | deuteranopia | Color-blind pass: set these apart by lightness, not hue alone. |
| modes-people | `--bot-doc` / `--mode-dynamic` | protanopia | Color-blind pass: set these apart by lightness, not hue alone. |
| modes-people | `--bot-gus` / `--mode-dynamic` | protanopia | Color-blind pass: set these apart by lightness, not hue alone. |
| modes-people | `--bot-viv` / `--mode-dynamic` | protanopia | Color-blind pass: set these apart by lightness, not hue alone. |
<!-- /palette:known -->

## Not yet tokens

Colors written in `index.html` outside a token. Each one becomes a token, or reuses one, in a later change. Generated from `palette.json`.

<!-- palette:untokenized -->
72 colors: `#000000`, `#00838f`, `#070a08`, `#07233a`, `#0b0f0c`, `#0b1a12`, `#0c3a22`, `#1b1b1b`, `#1e8e3e`, `#222222`, `#2a1212`, `#2e7d32`, `#33507a`, `#4a5a6a`, `#5b2a86`, `#5e7d5e`, `#69db7c`, `#6b6b6b`, `#7a1f2b`, `#7a5c13`, `#7f9a86`, `#8a9a8f`, `#8e5aa8`, `#93303d`, `#9be59b`, `#b8f5c4`, `#c2185b`, `#c792ff`, `#cfe0d4`, `#d32f2f`, `#e07b28`, `#ece6d4`, `#f2c14e`, `#f3e9ff`, `#f5f2e9`, `#ff4fd8`, `#ff8a80`, `#ff9ad5`, `#ffa94d`, `#ffb4ab`, `#fffdf6`, `#ffffff`, `rgba(0,0,0,0)`, `rgba(0,0,0,0.14)`, `rgba(0,0,0,0.22)`, `rgba(0,0,0,0.25)`, `rgba(0,0,0,0.28)`, `rgba(0,0,0,0.3)`, `rgba(0,0,0,0.35)`, `rgba(0,0,0,0.4)`, `rgba(0,0,0,0.45)`, `rgba(0,0,0,0.5)`, `rgba(0,0,0,0.55)`, `rgba(0,0,0,0.6)`, `rgba(0,0,0,0.75)`, `rgba(242,193,78,0.25)`, `rgba(255,255,255,0.04)`, `rgba(255,255,255,0.07)`, `rgba(255,255,255,0.08)`, `rgba(255,255,255,0.1)`, `rgba(255,255,255,0.12)`, `rgba(255,255,255,0.14)`, `rgba(255,255,255,0.16)`, `rgba(255,255,255,0.18)`, `rgba(255,255,255,0.2)`, `rgba(255,255,255,0.22)`, `rgba(255,255,255,0.3)`, `rgba(255,255,255,0.35)`, `rgba(255,255,255,0.45)`, `rgba(255,255,255,0.55)`, `rgba(52,199,89,0)`, `rgba(52,199,89,0.8)`.
<!-- /palette:untokenized -->
