# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Northeastern students on a meal plan, deciding where and what to eat at the three residential
dining halls (Stetson East, International Village, 60 Belvidere). Confirmed (2026-10-18): they open
the site in three situations about equally, and every surface must serve all three:

- deciding right now, usually on a phone, about to eat or walking over;
- planning ahead, earlier in the day or week ("what's for dinner tonight or tomorrow?");
- standing in the hall, choosing which station to queue at.

A smaller group signs in to log meals against nutrition goals and vote between Stetson East and
International Village.

## Product Purpose

Help a student find something they will want to eat, at a hall that is open, quickly. A visit
succeeds when the student knows where to go and what to get without reading every item.

## Positioning

The official DineOnCampus site lists every item, including every salad-bar ingredient and
condiment, in a flat list. NU Dining reads the same live data and orients it: real dishes first,
build-your-own bars and extras folded away, today's rotating dishes called out, and diet and
nutrition needs applied across everything.

## Operating Context

- Menus and hours load live in the browser from the DineOnCampus v1 API; there is no scraper
  dependency. The menu is organised by DineOnCampus into periods (Breakfast, Brunch, Lunch,
  Dinner, sometimes duplicated) and stations ("categories") such as CUCINA, HOMESTYLE, FLAME,
  DELI, FRESH 52 A, SWEET SHOPPE.
- Typical volume: 80 to 160 items per meal across 6 to 14 stations. Most of that count is
  build-your-own ingredients (salad bars, deli, omelet station) and condiments.
- Used on phones far more than desktop; also on laptops while planning.

## Capabilities and Constraints

- Per item, DineOnCampus provides: name, station, portion, calories, a nutrient panel, labels
  (Vegan, Vegetarian, Avoiding Gluten, Good Source of Protein, and others), allergens,
  ingredients, and sometimes a short description. No photos.
- Signed-in features (tracker, voting, dish rankings) live in Firebase and must degrade gracefully
  when it is unavailable; menus and hours never require an account.
- What to surface first (confirmed): the main dishes that look tasty, filtered by diet needs and
  nutrition goals, with what is new today called out.
- "New today" can only be inferred by comparing against neighbouring days' menus; it is not a
  field in the data.

## Brand Commitments

- Name: NU Dining. Mark: a bowl with a red flame (`src/ui/Logo.jsx`). Northeastern red is the
  accent.
- The user's binding request: the interface should make people crave food.
- No food photography: confirmed 2026-10-18 that the design relies on colour, type, illustration
  and wording only, so nothing can break or go stale.
- Appearance (2026-11-16): dark by default, with a light option the visitor can switch to; the
  choice is remembered. This replaces the earlier "follow the device, no toggle" decision.
- Bar to match (2026-11-16): Resy and Beli. It should feel like an app (cards, rows, sheets),
  not a printed menu or a poster.

## Evidence on Hand

- Real menus, live, every day; trimmed real responses in `front-end/test/fixtures/`.
- Dish descriptions written by the dining team appear on a minority of items; they are real copy
  and may be shown. Descriptions must never be invented for items that lack one.
- No testimonials, ratings or photos exist; do not fabricate them.
- User survey, reported 2026-11-16: 98% of respondents said the Flavor Pack build (colour-flooded station cards) looked vibe coded, AI-built. Future work must avoid the recognised tells: many competing saturated colours, nested cards, decorative status dots, icon tiles, eyebrow labels, greeting headlines and generic copy.

## Product Principles

1. Lead with food, not with structure: a real dish beats a station name, which beats a count.
2. Fold the parts, never hide them: ingredients, condiments and staples stay one tap away.
3. Every claim comes from the data: labels, "new today" and nutrition are computed, not guessed;
   say when something could not be determined.
4. One glance from a phone in a hallway should be enough to choose.

## Accessibility & Inclusion

WCAG 2.2 AA: text contrast 4.5:1, 44px touch targets, text that scales, no colour-only meaning,
no timed UI, reduced motion respected. Allergen information is dining-team data and must keep its
"confirm with staff" caveat.
