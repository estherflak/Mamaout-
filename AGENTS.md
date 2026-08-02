# MamaOut — project notes

## Brand identity (canonical)

- **Brand:** [marketing/brand.md](marketing/brand.md) — personality, colors, type, things to avoid.
- **Design system:** [marketing/design-system/guidelines.md](marketing/design-system/guidelines.md) — tokens, component specs, RTL rules.
- **App tokens:** [src/styles/tokens.css](src/styles/tokens.css) (`--mo-*` custom properties) + brand colors/fonts in [tailwind.config.js](tailwind.config.js) (`lilac`, `plum`, `butter`, `canvas`, `card`, `warmline`, `blush`; `font-serif`, `font-brand-sans`, `shadow-soft/raised/float`).

Rules for any UI work:

- New UI uses **brand tokens only**. The `dusty-*` / `sage-*` / `cream-*` Tailwind colors and Inter are the **legacy theme being phased out** — don't add new usages.
- Text is plum on cream/butter, or cream on plum. Never white text on lilac; never lilac text on cream.
- Butter (`#FFD97A`) is the accent: CTAs and suns, **one pop per screen**.
- Backgrounds: warm cream or pale lilac — never pure `#FFF` full-bleed (cards use `#FFFDF9`).
- Sentence case everywhere; no ALL CAPS (no `uppercase` class).
- Errors use soft rose `#D98B8B` — never alarm red. No urgency/FOMO copy ("don't miss out", countdowns).
- Pill radii for buttons/chips; 16px cards, 24px modals; plum-tinted shadows, not gray.
- Hebrew: fonts swap via `:lang(he)` (already in tokens.css), layout mirrors via `dir`; numbers/times/prices stay LTR.

Known gaps between the live app and the brand are tracked in
[marketing/design-system/app-audit.md](marketing/design-system/app-audit.md) — check it before styling work.

## Imported Claude Cowork project instructions

I built an app as a side project during my maternity leave to map all the events for moms and babies in Tel Aviv and Ramat gan. 

The goal is to create a user friendly app for moms with a nice scraper to fetch all the relevant events in one place 

The app is called mamaout and this is the website. It's still a minimal prototype 
https://manaout-git-main-esther-s-projects15.vercel.app/

we are now trying to improve features, fix bugs and share it with a real audience
