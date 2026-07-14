# MamaOut design system

*v1 · July 2026 · Derived from `marketing/brand.md` + the live app. Canonical palette is the brand.md lilac/plum/butter family; the app's legacy dusty-rose/sage theme migrates toward it.*

MamaOut helps moms on maternity leave (babies 0–12 months, Gush Dan) find a reason to leave the house today in under a minute. The design system's job: warm, sunny, zero pressure. A mom made this, and it shows.

## Personality

**Empathetic · Welcoming · Fun** — with a pinch of wry honesty as seasoning. Never: corporate/techy (gradients, SaaS-blue, buzzwords), parenting-guru tone (advice, milestones, expert posture), pink babyland clichés (storks, rattles, pacifiers), or manufactured urgency (countdowns, FOMO, "don't miss out").

## Color

| Token | Hex | Role |
|---|---|---|
| Lilac | `#A78BFA` | Primary — selected states, hearts, links; **never carries text on light** |
| Plum | `#4C2A85` | All text, wordmark, high-contrast fills |
| Butter | `#FFD97A` | Accent — CTAs, suns; **one pop per composition** |
| Warm cream | `#FAF6EF` | Default canvas |
| Pale lilac | `#F3EEFF` | Alt background, chips, tonal buttons |
| Card white | `#FFFDF9` | Card surfaces (never pure `#FFF` full-bleed) |
| Soft ink | `#7A6C99` | Secondary text, captions |
| Sage | `#7DA37D` | Functional success only |
| Soft rose | `#D98B8B` | Functional error only — never alarm red |

Approved text pairings: plum on cream, plum on butter, cream on plum. Forbidden: white on lilac, lilac text on cream (decorative only). Max 3 colors per Instagram post.

## Typography

- **Latin:** Fraunces 600 for headlines (display 32 / h1 24 / h2 19), Nunito Sans for body (15), small (13), caption (11.5, bold, soft ink).
- **Hebrew:** Noto Serif Hebrew replaces Fraunces; Assistant replaces Nunito Sans. Swap via `:lang(he)`, not per page.
- Sentence case everywhere. No ALL CAPS. Numbers/times/prices stay LTR inside RTL text.

## Layout, radius, elevation

4pt spacing scale (16px default gap and mobile side padding, 24px card padding, 32px section gap). Radii: 12 inputs, 16 cards, 24 modals, pill for buttons/chips/tags — nothing sharp. Shadows are plum-tinted (8/10/14% opacity), never gray. Borders `#EEE5D8`. Tap targets ≥ 44px.

## Components

- **Buttons:** primary = butter bg + plum text, pill, one per screen; secondary = plum fill; tonal = pale lilac; ghost = underlined plum. Disabled = warm gray, not faded yellow. Pressed = scale .98. No urgency copy.
- **Chips:** pill, card-white with warm border; selected = plum fill + cream text. Suggestion chips = pale lilac with one leading emoji. Day strip: today = butter fill.
- **Cards:** metadata caption → Fraunces title → venue line → tags → actions. Heart: pale-lilac circle 🤍 unsaved, lilac 💜 saved; signed-out tap opens AuthSheet. Place cards (expanded) use pale lilac to differ from activity cards.
- **Navigation:** 4 tabs, emoji as icons (grayscale when inactive), butter underline on active. Search placeholder speaks like a person, bilingual.
- **Empty states:** never blame, always offer the next best thing.

## Iconography

Emoji are the icon system — warm, bilingual, zero asset weight. One per element, leading position. Doodles (sun, squiggle, star, stroller path) are hand-drawn accents in butter or lilac: max one per composition, corner placement, decorative only.

## Wordmark (direction, logo TBD)

Lowercase `mamaout` in Fraunces 600 plum; the "o" of "out" is a butter sun with rays — the sun-dot stands alone as app icon/avatar. Clear space = height of the "m"; min width 90px. In running text: MamaOut. No caps, gradients, outlines, or babyland icons in the mark. Logo to be designed in Claude Design from this direction.

## Voice quick reference

✓ "We left the house before noon. Framed it." · "Pick one, or don't. The couch is also valid."
✗ "Don't miss out!" · "5 activities every baby NEEDS" · "Hey supermom!! 💪✨"

Hebrew addresses her directly and femininely (שמרי, נסי). Same no-pressure rules in both languages.

## Files

- `tokens/tokens.css` — CSS custom properties for dev handoff
- `foundations/` — colors, typography, spacing/radius/elevation
- `brand/` — wordmark direction, voice
- `components/` — buttons, chips, cards, navigation
- `bilingual/` — Hebrew & RTL rules
- `marketing/` — Instagram & social rules
