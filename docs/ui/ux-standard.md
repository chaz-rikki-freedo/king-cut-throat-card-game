# Game UI and UX design standard

A practical standard for clarity, simplicity, responsiveness and game feel.

This is the governing standard for the King Cut-Throat interface. A narrower standard for one part of the interface applies this page; where they disagree, this page wins.

## 1. Governing philosophy

The interface exists to make the game understandable, playable and enjoyable.

It should communicate the current game state, make available actions obvious, respond immediately to player input, and stay out of the way when it has nothing useful to contribute.

Prefer:

- Simplicity over complexity.
- Clarity over decoration.
- Visual communication over unnecessary reading.
- Appropriate whitespace over visual density.
- Responsive sizing over fixed dimensions.
- Consistency over novelty.
- Immediate feedback over ambiguity.
- Progressive disclosure over presenting everything simultaneously.

Do not add interface elements merely because there is room for them. Every element should justify its presence.

## 2. Sakurai: menu design and accessibility of choices

Apply Masahiro Sakurai's menu-design philosophy.

- Make primary actions immediately recognizable.
- Minimize the steps between launching the game and playing.
- Use intuitive labels rather than unexplained jargon.
- Prefer visual communication where practical.
- Explain unfamiliar options concisely.
- Keep advanced settings secondary.
- Make every meaningful input visibly acknowledged.
- Ensure navigation is predictable.
- Avoid unnecessary confirmation screens and interruptions.

A player should not have to study the interface to discover how to play.

## 3. Cognitive UX: Celia Hodent

Design around human perception, attention and working memory.

- Present relevant information when and where it is needed.
- Minimize unnecessary memory demands.
- Distinguish important information from secondary information.
- Avoid competing visual priorities.
- Make game states and available decisions readily understandable.
- Teach through contextual feedback rather than lengthy instructions.
- Do not mistake familiarity with the game for interface clarity.

The player should spend cognitive effort playing the game, not deciphering the interface.

## 4. Usability: Jakob Nielsen

Apply established usability heuristics.

- Keep the system's current state visible.
- Provide immediate and understandable feedback.
- Use consistent controls and terminology.
- Prevent accidental actions.
- Make errors recoverable where appropriate.
- Give players control over navigation and interaction.
- Avoid requiring players to remember information presented elsewhere.
- Ensure interactive elements behave as expected.

## 5. Spatial integrity and information uniqueness

Always consider what exists behind a panel, overlay, modal, tooltip or temporary interface element.

Never assess a panel in isolation. Evaluate the complete composition, including the content it obscures, the information it duplicates and the space it consumes.

When information appears in two places, determine which presentation should own it.

There are two preferred solutions:

1. Cover the underlying information completely and intentionally while the panel is active.
2. Remove the duplicated information from the panel, retaining the original presentation.

Do not allow two simultaneously visible representations of the same information to compete for attention or create uncertainty about which is authoritative.

Additional rules:

- Avoid partially obscuring important information.
- Avoid translucent overlays that leave underlying text or controls competing with foreground content.
- Do not repeat scores, statuses, instructions or labels without a clear functional reason.
- When an overlay temporarily takes ownership of information, make that ownership visually obvious.
- Preserve useful underlying context whenever possible.
- Consider whether a panel is necessary at all.

One piece of information should have one clear visual authority at a time.

## 6. Visual economy, whitespace and alignment

Simplicity is a design objective, not merely an aesthetic preference.

- Remove redundant labels, borders, icons, decoration and instructions.
- Use whitespace deliberately to separate logical groups.
- Do not fill available space simply because it exists.
- Establish consistent alignment between related elements.
- Use a small, consistent set of spacing relationships.
- Maintain clear visual hierarchy.
- Avoid unnecessary containers inside containers.
- Avoid excessive borders, shadows and background treatments.
- Make related information visually related.
- Make unrelated information visually distinct.

Whitespace is useful. Empty space is not a design failure.

Alignment is important. Elements should share deliberate edges, baselines, centers or spacing relationships. Avoid arbitrary positioning that makes the interface feel assembled rather than designed.

## 7. Responsive and adaptive sizing

Prefer adaptive layouts over fixed dimensions.

- Adapt to viewport width, height and aspect ratio.
- Preserve readability at different screen sizes.
- Allow cards, panels and controls to scale appropriately.
- Use available space efficiently without forcing content to fill it.
- Avoid unnecessary scrolling during active gameplay.
- Maintain usable touch targets.
- Prevent clipping, overlapping and unintended wrapping.
- Preserve visual hierarchy across screen sizes.
- Prefer fluid sizing with sensible minimums and maximums.
- Reevaluate spacing and composition at different viewport sizes rather than merely shrinking everything proportionally.

Mobile and desktop should feel like intentional presentations of the same game, not compromised versions of each other.

## 8. Accessibility

Essential information must remain perceivable and controls operable.

- Use sufficient contrast.
- Maintain readable text sizes.
- Never communicate essential information through color alone.
- Make card ranks and suits distinguishable.
- Provide sufficiently large interactive targets.
- Make selection, hover, focus, disabled and active states distinguishable.
- Avoid unnecessary animation and motion.
- Provide meaningful feedback through more than one sensory channel where appropriate.

Accessibility should be integrated into the design rather than added afterward.

## 9. Game feel: responsiveness and sensory feedback

Apply game-feel principles without sacrificing clarity.

- Acknowledge meaningful actions immediately.
- Make card selection and movement feel deliberate.
- Use animation to communicate state changes, not merely decorate them.
- Keep transitions proportional to the importance of the event.
- Use sound where it reinforces meaningful game events.
- Avoid animation that delays a player's next meaningful action.
- Ensure important changes remain understandable when animations are disabled or missed.
- Give scoring, trick resolution and significant outcomes appropriate visual weight.

The interface should feel responsive, confident and intentional.

## 10. Protect the intended challenge

Do not confuse interface friction with gameplay difficulty.

Remove:

- Confusing controls.
- Unclear game states.
- Hidden legal actions.
- Unreadable information.
- Redundant instructions.
- Unnecessary navigation.
- Ambiguous feedback.

Preserve:

- Strategic uncertainty.
- Meaningful decisions.
- Risk and consequence.
- Deliberate pacing.
- Competitive tension.
- The complexity inherent in mastering the game.

The interface should make the game easier to understand without making the game itself easier.

## 11. Assessment procedure

When reviewing an existing interface:

1. Inspect the actual implementation and rendered UI.
2. Trace the relevant interaction flows and state transitions.
3. Evaluate the complete composition, including content behind panels and overlays.
4. Examine information duplication and competing visual representations.
5. Evaluate both first-time and experienced player experiences.
6. Check multiple viewport dimensions and aspect ratios.
7. Identify concrete usability problems rather than subjective aesthetic preferences.
8. Recognize existing decisions that already work well.
9. Rank proposed improvements by practical impact.

For every finding, provide:

| Field | Content |
|---|---|
| Location | Specific screen, component or interaction. |
| Observation | What actually happens. |
| Problem | Why it matters to the player. |
| Principle | Which part of this standard applies. |
| Recommendation | The smallest effective improvement. |
| Priority | High, medium or low. |
| Confidence | Verified observation, or hypothesis requiring testing. |

## 12. Implementation discipline

When making changes:

- Inspect before modifying.
- Prefer small, targeted changes.
- Preserve existing architecture and established conventions.
- Avoid unnecessary dependencies.
- Avoid speculative features.
- Do not rewrite working components without demonstrated benefit.
- Verify changes in the actual rendered interface.
- Check surrounding UI for regressions.
- Check the result at multiple viewport sizes.
- Ensure overlays, panels and temporary states compose correctly with underlying content.

Do not equate more code or more visual elements with improvement.

## 13. Decision hierarchy

When design objectives compete, resolve them in this order:

1. Correctness of game information and behavior.
2. Clarity of game state and available actions.
3. Readability and accessibility.
4. Spatial integrity and information uniqueness.
5. Simplicity and visual hierarchy.
6. Responsive composition and alignment.
7. Interaction feedback and game feel.
8. Decorative polish.

A lower-priority objective must not compromise a higher-priority one.

## Final standard

The best interface is not the one with the most features, information, animation or visual effects.

It is the one that communicates everything necessary, presents it in the right place at the right time, adapts to its available space, and then gets out of the player's way.

Every element must earn its place.
