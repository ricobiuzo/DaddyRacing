# DaddyRacing Out Run-Inspired Visual Style Guide

Implements `f7420afa-d0b2-4214-82a2-bfbf6d4ad6f8` ("Document the Out Run-Inspired Visual Style Guide"),
the prerequisite for `7a48cffe-2523-4de3-800c-47fac70ce675` ("Apply the Out Run-Style Visual Treatment
Across Tracks"). This is this CR's own concrete proposal — the EpicGroup's `RisksAndAssumptions`
left the exact parameters open, so these choices are a starting point, not a previously-approved spec.

## Colour palette

| Role | Hex | Notes |
|---|---|---|
| Sky top | `#4FC3F7` (day) / `#0D1B4C` (night) | Vertical gradient down to the horizon band |
| Sky horizon band | `#FFE08A` (day) / `#FF7A59` (night) | A warm band at the horizon line, classic Out Run sunset look |
| Road surface | `#3A3A3A` | Desaturated grey, kept flat/unlit for the pseudo-retro feel |
| Road edge stripe | `#FFFFFF`/`#FF5C3D` alternating | Alternating stripe segments along both road edges |
| Ground / verge | `#4CAF50` (grass), `#C2A14D` (sand), `#355E3B` (wet forest floor) | Varies per track per `TrackDefinition.surface` |

## Lighting approach

- One directional "sun" light, low angle, warm colour temperature (`#FFE08A` day / `#88AAFF` night), to
  produce long, simple shadows rather than physically-accurate global illumination.
- A flat ambient fill light (no physically-based shading) so the track reads clearly at a glance, matching
  the flat-shaded look of the original arcade game rather than a modern realistic renderer.
- Night tracks (City Nights) drop the sun light's intensity and add small warm point lights along the
  roadside to suggest city lighting, without a full dynamic-lighting system.

## Horizon / road presentation

- Camera stays low and close to the kart (first-person, in-kart) with a wide field of view (~90°) to
  emphasise speed, per the Rendering Engine (`568ce9d7-59d5-4581-bc84-0ae0261c8cae`).
- The horizon line sits at a fixed screen height; sky gradient and horizon band are rendered on a large
  background sphere/plane behind the track geometry so they never clip.
- Distance fog in the sky/ground colour hides the track's draw distance limit, standing in for the
  original's sprite/scanline scaling without reproducing it pixel-for-pixel.

## Per-track variation (the "varying only by conditions" rule)

Every track reuses the same palette/lighting approach above; only the following vary, per
`TrackDefinition` in `src/types.ts`:

| Track | Time of day | Surface | What changes |
|---|---|---|---|
| Green Hills | Day | Dry | Baseline palette as above |
| City Nights | Night | Dry | Night sky gradient, point lights, dimmer sun |
| Sandy Desert | Day | Sandy, dry | Sand-coloured verge, slightly reduced grip |
| Wet Speed Way | Day | Wet | Wet asphalt, a specular sheen pass on the road material |
| Forest Ruins | Day | Wet | Wet surface, dense tree props along the verge |

## Out of scope

Per the "Retro Arcade Visual Rendering" EpicGroup's own scope: audio/music style, cutscenes, and menu
theming beyond in-race visuals are not covered by this guide.
