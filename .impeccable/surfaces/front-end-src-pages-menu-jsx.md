---
version: 1
slug: "front-end-src-pages-menu-jsx"
primary_target: "front-end/src/pages/Menu.jsx"
related_targets: ["front-end/src/pages/Home.jsx","front-end/src/pages/Rankings.jsx","front-end/src/ui/rank/RankSheet.jsx","front-end/src/pages/Hours.jsx"]
---

# Surface brief: menu, Today page, ranking and Your list

Scope: `front-end/src/pages/Menu.jsx`, with cross-surface reach into `Home.jsx`, `Rankings.jsx`, the rank sheet (`src/ui/rank/RankSheet.jsx`), the dish sheet and `Hours.jsx`. Visitor mode: Operate. Code-led.

Audience and job: Northeastern students deciding what to eat now, planning a later meal, or choosing a station inside the hall, and ranking what they ate. Bar to match (user, 2026-11-16): Resy and Beli. Constraints: system font stack; dark by default with a light option (user, 2026-11-16, replacing "follow the device"); no photos; nothing invented. Rejected (user, 2026-11-16): the printed-menu serif look, and "The Lineup" (too loud, poster-like, too much text, not app-like, "AI slop maxing").

## Direction contract

THESIS: A food app, not a document. A swipeable shelf of top picks, each station as one grouped card of tappable rows, and every dish opening the same bottom sheet. Refuses posters, run-in text, giant type and colour floods.

OWN-WORLD: Near-black ground #0F0F10 with #1A1A1C cards (light: #F4F4F5 ground, white cards), warm off-white ink, 18px card radius, hairline row dividers, one coral-red accent for actions and selection, Beli-style score rings tinted green/amber/red with the number always shown. System sans at 600/500/400; no weight above 700.

STORY: The student picks hall, day and meal, swipes the picks shelf, scans station cards, taps any dish for its sheet (nutrition, allergens, rank, log), and ranks it in three short steps.

FIRST VIEWPORT: 390x844. Hall switch pill, day strip, meal tabs, status line, search pill and filter chips, then the "Lunch picks" shelf with its first tile and the next one peeking.

FORM: User-pinned direction (Resy/Beli dark), overriding the roll's assignment; previous roll seed:2b4c4529af0426e9. Signature: the picks shelf plus the score ring.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
