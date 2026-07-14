# MamaOut Launch Plan

*Campaign: "Out of the house, into the city" — 6-week soft launch*
*Written July 2026 · Solo founder · Budget: ₪0 · Time budget: 2–3 hrs/week*

---

## 1. Overview

**Objective:** Get MamaOut in front of real Tel Aviv / Ramat Gan / Gush Dan moms and reach **300 weekly active visitors and 3 organic group shares per week by end of week 6.** Secondary: 200 Instagram followers, a feedback channel with 20+ real user responses.

**One-liner:** Every mom-and-baby event in Tel Aviv and Ramat Gan, in one place — updated daily, free.

**Strategy in one paragraph:** The landing experience is fixed first so the app explains itself in 5 seconds when a link lands in a WhatsApp group. Instagram is the public face, fed semi-automatically by the scraper's event data so it costs minutes, not hours. Distribution happens where moms already are — WhatsApp and Facebook mom groups — via authentic seeding, not ads. The blog is the brand layer: it makes MamaOut a person, not a listings site, and every post is recycled into Instagram content. Nothing in this plan assumes more than 2–3 hours a week.

---

## 2. Audience

**Primary:** Moms on maternity leave with babies 0–12 months in Gush Dan. Pain: leave is long, days are shapeless, events exist but are scattered across studio Instagram pages, WhatsApp forwards, and word of mouth. They want a reason to leave the house *today* without 40 minutes of searching. High phone usage, discovery happens in WhatsApp groups (by neighborhood and by baby's birth month), Facebook groups, and Instagram.

**Secondary:** English-speaking olim/expat moms — underserved by Hebrew-only sources, tight community, high sharing behavior. English content is a *feature* for them, not a compromise. (The app is bilingual EN/HE, so Hebrew-first moms are still served in-product.)

**Not now:** dads, parents of toddlers 1–3y, event organizers as customers. Organizers matter later as a supply-side channel.

## 3. Key Messages

**Core:** Stop scrolling ten Instagram pages to find something to do with your baby — MamaOut has it all in one place.

Supporting messages:

1. **Fresh, not stale.** Scrapers update daily — this isn't a listicle from 2024. *Proof: "updated today" timestamp, event count on the landing page.*
2. **Built by a mom on maternity leave, for moms on maternity leave.** *Proof: the blog, the founder story. This is the single strongest trust signal in mom groups — lead with it when seeding.*
3. **Made for the fog of month 3.** Filter by baby age, area, and day — decide in 30 seconds. *Proof: product demo clips.*
4. **Free, no signup wall.** Share a link, friend sees events immediately. *Proof: the link itself.*

Tone: warm, honest, a little wry about maternity-leave life. Never corporate, never "parenting-guru".

## 4. Channel Strategy

| Channel | Role | Effort/week | Why |
|---|---|---|---|
| Landing experience (app homepage) | Convert every visit; make shared links self-explanatory | One-time (~3 hrs) | Multiplier on all other channels |
| Instagram | Public face + discovery | ~1 hr (semi-automated) | Events are visual; local mom accounts cross-share; the scraper already produces the content |
| WhatsApp + Facebook groups | Distribution engine | ~30 min | Where the audience actually decides what to do this week; zero cost, highest trust |
| Blog | Brand, voice, fun, Instagram fuel | ~1 hr (because you enjoy it) | Makes MamaOut a person; each post → 2–3 IG posts; light SEO upside over time |
| SEO (passive) | Long-term free traffic | ~0 after setup | One indexable page per event with event schema markup beats a blog for SEO — it's a product task, not a marketing task |

**Explicitly not doing:** paid ads, TikTok, press outreach, influencer payments. Revisit only after organic sharing works — if moms don't share it for free, ads amplify a broken loop.

### Instagram operating model (the automation that makes 1 hr/week real)

- Handle: try `@mamaout.tlv` or `@mamaout.app`. Bio = one-liner + link.
- **Two recurring formats, both generated from scraper data:**
  - **Sunday "This week in TLV" carousel** — top 8–10 events of the week, one per slide, from a template (Canva or an HTML-to-image script from the Supabase data — the second is a one-time build that makes every future week ~15 min).
  - **Daily story (optional, batched)** — "3 things to do tomorrow", screenshot or template.
- One "voice" post per week — blog excerpt, behind-the-scenes, or founder note.
- Engagement: 10 min, 2×/week — comment as MamaOut on studios' and mom-accounts' posts. Every studio you scrape is a potential reposter: tag them; they share to their audience for free. **This is the flywheel: scraped sources become distribution.**

### Group seeding rules

- Share as Esther-the-mom, not as a brand. First message = story, not pitch: *"I'm on maternity leave with baby #3 and got tired of hunting through ten Instagram pages to find something to do, so I built a little site that collects all the mom-and-baby events in TLV/RG in one place. It's free, no signup — would love to know if it's useful: [link]"*
- 1–2 groups per week, not a blast. Prioritize: your own neighborhood/birth-month groups → English-speaking mom groups (Secret TLV for Moms-type, olim groups) → broader Gush Dan groups.
- Facebook groups: check pinned rules; ask admins first where promo is restricted — admins who say yes often become advocates.
- Reply to every comment within a day; each thread is user research.

## 5. Six-Week Calendar

| Week | Focus (≤3 hrs) | Output |
|---|---|---|
| 1 | **Foundation.** Rewrite landing hero (one-liner, event count, "updated daily" badge, share button). Create IG account, bio, first post (founder intro). | Landing live · IG exists |
| 2 | **Content engine.** Build the weekly-carousel template + generation flow from event data. Post first "This week" carousel. Blog post #1: the founder story ("I built an app during maternity leave"). | Repeatable IG format · blog live |
| 3 | **First seeding.** Share in 2 friendly groups (own neighborhood + birth-month group). Sunday carousel. Cut founder story into an IG post. Watch: do people click? What do they ask? | First real users |
| 4 | **Expand seeding.** 2 more groups incl. one English-speaking olim group. Carousel + 1 voice post. Start tagging studios in event slides. | Studio reposts begin |
| 5 | **Blog #2 + listen.** Practical guide (e.g. "Baby-friendly cafés in TLV that actually work with a stroller") — inherently shareable in groups on its own merit. Carousel. | Shareable asset |
| 6 | **Review & double down.** Check metrics vs. targets. Keep what worked, drop what didn't. Blog #3 (behind-the-scenes: how the scraper works). Ask engaged users for testimonials/shares. | Decision: what does week 7+ look like |

Dependencies: landing page before any seeding (W1→W3); carousel template before promising weekly cadence (W2); friendly groups before cold groups (W3→W4).

## 6. Content Assets

**Must-have:** landing hero copy + share button; IG bio & founder-intro post; weekly carousel template + data-to-image flow; seeding message (EN + HE variants); blog #1 (founder story).

**Nice-to-have:** daily-story template; blog #2 (café guide) and #3 (behind the scenes); 30-sec screen-recording demo reel; per-event pages with schema markup (product backlog — biggest SEO lever).

## 7. Metrics

Track weekly, 15 min on Fridays. Primary: **weekly unique visitors** (add Vercel Analytics or Plausible — do this in week 1, it's free and takes minutes). Secondary: IG followers & carousel shares (IG insights), group-share sightings (manual — screenshots when you spot an organic share), return-visitor rate, and qualitative feedback count. Targets at week 6: 300 weekly visitors, 200 followers, 3 organic shares/week, 20 pieces of feedback. [Guessing] on the specific numbers — they're calibrated to "solo founder, zero budget, 6 weeks" but the real point is trend direction, not the absolute figure.

## 8. Risks

1. **Time collapses (4-month-old, two other kids).** Mitigation: the plan degrades gracefully — the Sunday carousel alone (~30 min once templated) keeps MamaOut alive. Everything else is optional in a bad week.
2. **Groups flag seeding as spam.** Mitigation: personal story framing, admin permission, 1–2 groups/week max, never repost the same text twice.
3. **Traffic arrives but doesn't return.** That's a product signal (coverage gaps, missing filters), not a marketing failure — pause seeding, fix, resume. Ties to the coverage-gap discovery work already scoped.
4. **English-only social under-reaches Hebrew-first moms.** Watch for it in week 3–4 comments; cheap fix: Hebrew captions on carousels (the scraper already translates — reuse it).

## 9. Next Steps (this week)

1. Rewrite the landing hero + add share button (I can draft copy and implement).
2. Add analytics (Vercel Analytics: one dependency, one line).
3. Reserve the Instagram handle.
4. Draft the seeding message in EN + HE.

---

*Living document — update after the week-6 review.*
