# Table depth

Table depth makes the table read as a physical card table: each card sits at a height over the felt, and the shadow it
casts comes from that height. It changes how the table looks, never how the game plays. The code is section 7d
(`DEPTH` and `Depth`) of `index.html`.

## Goals

- Keep the composition, proportions, colors, type and information hierarchy as they are.
- Spend the effect on the played cards, your hand, card shadows and height.
- Keep informational parts (the info strip, tags, scores) still.
- Work by touch first. Don't depend on hover.
- Prefer small depth cues over large movement. Never make a card harder to read.

## The planes

| Plane | What it holds | Height in Still |
|---|---|---|
| Table | The felt | 0 |
| Panels | The seats and your panel | `panelLift` |
| Played cards | The trick | `trickZ`, and `winZ` for the winner |
| Your hand | Your cards | `handRest`, more as you touch or select one |
| Light | The shadows of everything above | From each height |

The light is fixed above the table. A shadow falls `shadowReach × height` below its card and blurs
`shadowBase + shadowBlur × height`, so a higher card casts a longer, softer shadow.

## The setting

Settings → Table → Theme → **Table depth**:

- **Still** (the default): the depth rules apply. A card in your hand lifts while you touch it. With a mouse, it
  lifts while the pointer is over it.
- **Off**: the classic table, exactly as before Table depth.

The setting is kept with the other settings (`kct.settings`, `depth`), so a backup holds it. **Reset this tab** sets
it back to Still.

## Rules for the code

- Change only `transform` and `box-shadow`. No card moves its place in the layout or its tap area.
- Read every number from `DEPTH`. The CSS reads them as `--dp-*` custom properties under `html.depth`. The `depth`
  self-test area checks that the CSS reads exactly the properties that `DEPTH` gives.
- A card lifts over `liftMs`. It lifts at once at speed Instant, under the system's reduced-motion setting, and at
  Fast when `fastMotion` is 0.
- Shadows reuse colors on the registry (`docs/ui/palette.json`). Don't add a color for depth.

## Tuning during a game

1. In the menu, type `!dev parallax` in **Load a code**, and then select **Load**.
2. Start or resume a game. The panel stays over the header for the tab, also after a reload.
3. Move a slider. The table changes at once. A value that differs from `DEPTH` shows a dot.
4. Select the **Off** checkbox to compare with the classic table. It doesn't change the setting.
5. Select **Copy** to get every value as JSON, to paste into `DEPTH`'s defaults.

**Reset** returns every value to `DEPTH`'s. The ✕ closes the panel. `!dev reset:parallax` also drops the values.
Tuned values last for the tab only (sessionStorage `kct-depth`), and a backup never holds them.

## Next steps

| Step | Scope |
|---|---|
| 1 (this) | `DEPTH`, the Still and Off setting, heights and shadows, the touch lift, and the tuning panel. |
| 2 | Tilt and pointer input. A **Tilt** choice turns on device orientation, opt-in only. iOS asks for permission on that tap, and no sensor listener runs otherwise. The angle when Tilt turns on is level, and the neutral point then slowly follows the grip. Each plane shifts by its own multiplier, the trick plane rotates by about 2° at most, and the shadows move opposite the tilt. On desktop, the pointer gives the same input. It is off at Instant, in menus and dialogs, and when the page is hidden. |
| 3 | Motion for playing a card, resolving a trick and revealing trump, from the same config. |
