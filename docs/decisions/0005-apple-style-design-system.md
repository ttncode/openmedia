# 0005 — Apple Human Interface style design system

Status: Accepted
Date: 2026-09-14

## Context

The web UI needs a design system: tokens for color, spacing, radii and
motion, and a way to write components against them. `apps/web` also needs a
brand identity distinct from ReClip's.

## Decision

The UI follows Apple Human Interface Guidelines style tokens: light and dark
palettes, spring easings generated as CSS `linear()` with a `cubic-bezier`
fallback, glass materials that fall back to solid under
`prefers-reduced-transparency` or without `backdrop-filter` support, and
consistent radii for panels, groups, artwork and capsules. Components are
written with CSS Modules against `apps/web/src/app/globals.css`'s token
sheet rather than Tailwind utility classes, because the layered tokens,
springs and materials this design relies on read more clearly as CSS custom
properties and rules than as utility class chains. The brand's default
accent is teal (`#12939c`), taken from the logo mark, with seven accent
choices available in Settings.

## Consequences

Every component shares the same tokens for color, motion and shape, so a
token change (a new accent, a radius adjustment) applies everywhere it is
used instead of needing to be repeated per component. Tailwind stays
installed, since the generator ships it, but is unused for styling; this is
a deliberate inconsistency with a default scaffold project; readers of
`apps/web` should expect CSS Modules, not utility classes, in component
files.

## Alternatives considered

- Tailwind utilities throughout. Rejected: expressing spring easings, glass
  materials and the light and dark accent pairs used here as utility classes
  would mean either a large custom Tailwind config that amounts to the same
  token sheet, or repeating raw values inline across every component.
- shadcn/ui defaults. Rejected: its component shapes and motion are close to
  Radix and Tailwind conventions, not to the Apple Human Interface
  Guidelines look this project targets; adapting it would mean overriding
  most of what it provides.
