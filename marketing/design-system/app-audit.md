# App vs. brand — audit & migration backlog

*July 15, 2026 · Audited against `marketing/brand.md` + `guidelines.md`. Ranked by importance; effort noted per item. Nothing fixed yet — this is the backlog.*

**Overall:** the app still runs entirely on the pre-brand theme (dusty-rose/sage/stone, Inter, gray shadows). The voice/copy is largely already on-brand (no FOMO, no guru tone, warm bilingual strings) — the gap is almost all visual.

## Critical

### 1. Entire color theme is legacy — no lilac/plum/butter anywhere
Every interactive and accent surface uses `dusty-rose`/`sage` (~90 usages across 20+ files: selected chips, day pills, hearts, primary buttons, active nav, scrollbar in `src/index.css`). Butter — the "go outside" accent — appears zero times.
**Importance: critical** — the palette *is* the brand; today the app reads as a different product than the Instagram/marketing side will.
**Effort: medium** — mostly a mechanical class swap now that tokens are in Tailwind (`dusty-rose → lilac`, `sage → success` where functional), plus judgment calls on which element per screen gets butter. Suggested first pass: chips/selected states → plum fill + cream text, primary CTAs → butter + plum, hearts → lilac.

### 2. Typography — Inter everywhere, no serif, no Hebrew pairing
`tailwind.config.js` / `index.css` load only Inter. Brand: Fraunces 600 headlines + Nunito Sans body, with Noto Serif Hebrew + Assistant swapped via `:lang(he)`. No screen title uses a serif; Hebrew renders in Inter's fallback.
**Importance: critical** — the serif is the "editorial, human voice" half of the identity.
**Effort: medium** — fonts + tokens are now loaded (this commit); remaining work is switching the default `sans` to Nunito Sans/Assistant and applying `font-serif` to h1/h2/screen titles (~15 headings), then eyeballing Hebrew.

## High

### 3. White text on primary fills (forbidden pairing + contrast)
21 instances of `bg-dusty-rose … text-white` (EmptyState CTAs, DayStrip selected pills, SuggestionChips active, Login/Submit buttons). Brand forbids white-on-lilac; selected = plum fill + cream text, primary button = butter + plum. White on `#A78BFA` also fails WCAG contrast, so a naive rose→lilac swap would make this worse.
**Importance: high**. **Effort: low** — folds into item 1 if done together; listed separately so the swap isn't done naively.

### 4. Brand mark: 🌸 flower as de-facto logo, sans-serif wordmark
Favicon (`index.html`), Login/Reset/Onboarding/Submit hero emoji, generic empty state, wellness category, and WhatsApp share text (`src/lib/share.js`) all use 🌸. Brand direction: butter **sun** motif; pink flower drifts toward "pink babyland". Login/Reset render "MamaOut" in bold Inter instead of the lowercase Fraunces-plum wordmark.
**Importance: high** — it's the identity users screenshot and share.
**Effort: low** for the interim (swap 🌸 → ☀️/🌞 in ~8 spots + favicon, restyle the text wordmark per the direction); the real wordmark asset is blocked on the logo design in Claude Design.

## Medium

### 5. Off-palette badge/category colors
`ActivityCard.jsx` hardcodes 7 category border hexes (soft pink `#f9a8d4`, light blue `#7dd3fc`…); stroller + English badges are SaaS-blue (`bg-sky-50 text-sky-600`); free = green, mom-tip = amber, friend badge = sage. Brand allows sage only as functional success and wants accents from the lilac/butter family.
**Importance: medium** — cards are the core surface, but these are small elements.
**Effort: medium** — needs a small design decision (a brand-derived category ramp), then a one-file remap.

### 6. ALL CAPS form labels
`uppercase tracking-wide` on 10 labels in `CommunityAddScreen.jsx` (151, 172, 220, 247), `SubmitScreen.jsx` (126, 161, 178, 227), `FriendsScreen.jsx` (192, 219), plus the DayStrip month marker (56). Brand: sentence case everywhere, no ALL CAPS.
**Importance: medium** — direct written rule, very visible on forms.
**Effort: trivial** — delete the classes (caption style = 11.5px bold soft-ink instead).

### 7. Alarm red for badges and errors
Friend-request badge `bg-red-400` (`BottomNav.jsx:43`), ~16 `red-*` usages for errors/destructive actions across Login/Profile/Admin/Friends. Brand: soft rose `#D98B8B`, "never alarm red" — red is exactly the pressure signal the brand avoids.
**Importance: medium**. **Effort: low** — swap to `blush` token; keep semantics.

### 8. Component specs: nav, hearts, day strip
- `BottomNav.jsx`: SVG line icons + rose active state; spec = emoji icons (grayscale when inactive) + butter underline on active.
- Hearts (`ActivityCard.jsx:76`, SavedScreen): SVG heart in dusty-rose; spec = pale-lilac circle with 🤍/💜.
- `DayStrip.jsx`: today/selected should be butter fill per spec.
**Importance: medium** — signature components from the design system.
**Effort: medium** — small rewrites of three components; behavior (AuthSheet gating etc.) already matches spec.

## Low

### 9. Pure-white surfaces, gray shadows, cool borders
62 `bg-white` (cards, nav, sheets — brand: card `#FFFDF9`, never pure white), gray `shadow-sm` instead of plum-tinted, `border-stone-*` instead of warm `#EEE5D8`, canvas `#fdfaf6` vs brand `#FAF6EF`.
**Importance: low** — subtle warmth, users won't name it but will feel it.
**Effort: low** — mechanical swaps (`bg-white → bg-card`, `shadow-sm → shadow-soft`, `border-stone-100/200 → border-warmline`); natural to batch with item 1.

### 10. Copy polish (already ~90% on-brand)
Strings avoid FOMO/urgency/guru tone; exclamation marks are of the celebratory kind the brand allows. Worth a single later pass to add the "pinch of wry" to empty states and confirmations (e.g. the "couch is also valid" register) once visuals land.
**Importance: low**. **Effort: low.**

## Suggested sequence

1. **Quick wins, one small PR:** items 6 + 7 + 4-interim (caps, reds, sun-for-flower) — trivial, no design decisions.
2. **The theme migration, one focused PR:** items 1 + 3 + 9 together (color swap done with the approved text pairings), then 2 (type).
3. **Component pass:** items 8 and 5 (needs the category-ramp decision).
4. **Blocked on assets:** real wordmark/app icon (4) after the logo is designed in Claude Design.
