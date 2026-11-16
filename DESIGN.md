---
name: NU Dining
description: Northeastern's dining halls as a dark food app, with grouped station cards, a picks shelf, one sheet per dish and score rings.
colors:
  brand: "#E0283C"
  brand-ink: "#FFFFFF"
  brand-soft: "#3A1A1E"
  brand-text: "#FF6B76"
  bg: "#0F0F10"
  surface: "#1A1A1C"
  surface-2: "#242427"
  surface-3: "#2E2E32"
  ink: "#F3F1ED"
  ink-muted: "#ABA8A2"
  ink-subtle: "#908D87"
  line: "#2C2C30"
  line-strong: "#6E6C68"
  card-line: "#262629"
  score-high: "#4CD38A"
  score-mid: "#E8B54A"
  score-low: "#FF7A7A"
  open: "#4CD38A"
  open-soft: "#10291B"
  warn: "#FFB340"
  warn-soft: "#33240C"
  danger: "#FF8792"
  danger-soft: "#3A1519"
  gold: "#E8B64C"
  gold-soft: "#33280F"
  series-1: "#3987e5"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title-sm:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.02em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.5
  dish-name:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 500
    lineHeight: 1.375
  subhead:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
  score-numeral:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "'tnum' 1"
rounded:
  lg: "8px"
  xl: "12px"
  2xl: "14px"
  card: "18px"
  sheet: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-3}"
  button-ghost:
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "44px"
  chip:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "44px"
  chip-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
  station-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
  dish-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.dish-name}"
    padding: "12px 16px"
    height: "56px"
  dish-row-hover:
    backgroundColor: "{colors.surface-2}"
  pick-tile:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "16px"
    width: "248px"
  score-ring:
    textColor: "{colors.score-high}"
    typography: "{typography.score-numeral}"
    rounded: "{rounded.full}"
    size: "48px"
  dish-sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sheet}"
    padding: "16px 20px 20px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "0 14px"
    height: "48px"
  search-pill:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0 44px"
    height: "44px"
  segmented-hall-switch:
    backgroundColor: "{colors.surface-2}"
    rounded: "{rounded.full}"
    padding: "4px"
  segmented-hall-switch-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  day-cell-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
    rounded: "{rounded.xl}"
    size: "48px"
  tab-bar-item-active:
    textColor: "{colors.brand-text}"
    height: "56px"
---

# Design System: NU Dining

## Overview

**Creative North Star: "The Late-Night Table"**

NU Dining sits on the same shelf as Resy and Beli: a near-black app by default, warm off-white type, and food presented as tappable things rather than as a document. Every menu is the same three moves: a swipeable shelf of picks, each station as one grouped card of rows, and every dish opening the same bottom sheet. Scores live in Beli-style rings whose number always carries the meaning; the ring's tint only echoes it.

Density is app-like, not editorial. Rows are 56px tall with a quiet second line, cards are 18px-rounded with hairline dividers between rows, and the type never climbs above 48px. One coral-red accent marks what you can act on and where you are. Everything else is neutral greys with a faint warm cast in dark mode and a cool cast in light mode.

Dark is the default appearance; light is a remembered choice. The world was built to replace an editorial "poster" world (red plate, run-in text, heavy 800 weights, giant billing type), and those devices are rejected here.

**Key Characteristics:**
- Dark by default (#0F0F10 ground, #1A1A1C cards); light on request, saved under `nu-dining:theme` and applied before first paint.
- Grouped station cards: 18px radius, hairline row dividers, rows that open a sheet.
- A horizontally swiping picks shelf whose next tile always peeks.
- One bottom sheet per dish, the same anatomy everywhere.
- Score rings tinted by tier, number always visible, 700 weight only there.
- One coral-red accent for actions, the active tab and links.
- System sans at 400, 500 and 600.

## Colors

A near-neutral, low-chroma ground with one coral-red accent and three score tints that only ever echo a number or a word.

### Primary

- **Coral Plate Red** (`brand`): fills primary buttons, the 3px underline under the active desktop nav item and active meal tab, the account avatar, the logo flame, text selection, caret and native control accents. Its fill carries `brand-ink` white text. Light: #D41F35.
- **Coral Link Red** (`brand-text`): the readable form of the accent, for text. Used for links ("Full lunch menu", "Show 4 more", "Clear filters"), the active mobile tab bar item, and the focus ring. Light: #C01B30.
- **Coral Wash** (`brand-soft`): a tinted ground reserved for accent-adjacent quiet surfaces. Light: #FBE9EC.

### Secondary

- **Score High** (`score-high`), **Score Mid** (`score-mid`), **Score Low** (`score-low`): the ring and numeral tint for scores of 6.8 and above, 3.4 to 6.7, and below 3.4. Also the bucket range pills in the ranking sheet. Light: #13803F, #9A6A00, #C0262D.

### Tertiary

- **Open Green** (`open`) and **Soon Amber** (`warn`): status words ("Open until 10 PM", "Closing soon, 10 AM"). Their `-soft` grounds back success and warning notices. Light: #13803F, #A84B00.
- **Danger** (`danger`, `danger-soft`): errors, the sign-out item, destructive buttons. Light: #B00D25.
- **Gold** (`gold`, `gold-soft`) and **Series Blue** (`series-1`): Vote and Tracker data accents only.

### Neutral

- **Night Ground** (`bg`): the page. Light: #F4F4F5.
- **Card** (`surface`): station cards, pick tiles, sheets, inputs, footer. Light: #FFFFFF.
- **Raised Fill** (`surface-2`): pills, chips, search, secondary buttons, row hover. Light: #ECECEE.
- **Pressed Fill** (`surface-3`): row active and secondary-button hover. Light: #E2E2E5.
- **Warm Ink** (`ink`): primary text, and the fill of pressed chips and the selected day. Light: #141416.
- **Muted Ink** (`ink-muted`): second lines, meta, inactive tabs. Light: #55555C.
- **Subtle Ink** (`ink-subtle`): chevrons, placeholders, the "New" word, closed status. Light: #6B6B73.
- **Hairline** (`line`): row dividers inside cards, tab baselines, sheet section rules. Light: #E2E2E5.
- **Card Edge** (`card-line`): the 1px border on cards, sheets, the header and the tab bar. Light: #E6E6E9.
- **Strong Line** (`line-strong`): non-text UI that must meet 3:1, such as input borders and the scrollbar. Light: #8D8D94.

Every value above has a light counterpart under `:root` and its dark default under `:root[data-theme="dark"]`. The frontmatter records the dark default; the sidecar carries both. Raising contrast (`prefers-contrast: more`) swaps `card-line` to `line-strong` and `ink-muted` to `ink`.

**Legacy aliases.** `plate`, `plate-ink`, `plate-muted` and `g1` to `g9` still resolve (to `brand`, `brand-ink`, `brand-soft` and the neutral roles above) so older screens keep rendering. They are aliases, not part of the system: new work uses the role names.

### Named Rules

**The One Accent Rule.** Coral red means "act here" or "you are here": a primary button, the active tab, a link. It never fills a card, a header or a section ground.

**The Number Carries It Rule.** Score tint, status colour and tier colour always sit on a number or a word that says the same thing. Colour alone never carries meaning.

## Typography

**Display Font:** the system sans (SF Pro on Apple, Segoe UI on Windows, Roboto on Android), falling back to Helvetica Neue, Arial, sans-serif.
**Body Font:** the same system sans.

**Character:** one native family at three weights, the way a phone app reads. Hierarchy comes from size steps and weight, never from a second face, caps or tracking.

### Hierarchy

- **Display** (600, 3rem, 1.08): the single big figure on a data screen, such as Tracker's calories left. Not a page title.
- **Headline** (600, 2rem, 1.15): page titles ("Today's menus") and the auth screens.
- **Title** (600, 1.375rem, 1.3): the picks shelf heading and hall card names on Today.
- **Title small** (600, 1.25rem, 1.35): station names above their cards, sheet titles, empty-state titles.
- **Body** (400, 1.0625rem, 1.5): running text and sheet descriptions. Reading width stays near 42rem (`max-w-2xl`).
- **Dish name** (500, 1.0625rem, about 1.375): the name in every dish row. Pick tiles and ranking options step it to 600.
- **Subhead** (400 or 600, 0.9375rem, 1.45): status lines, counts, chips, buttons at small size, link actions.
- **Label** (400, 0.8125rem, 1.4): the quiet second line under a dish, tile station names, nutrition labels, tab bar labels.
- **Score numeral** (700, tabular, 0.8125rem to 2.75rem by ring size): only inside score rings and score-range pills.

Headings h1 to h3 get `-0.02em` tracking and balanced wrapping; paragraphs get pretty wrapping. All sizes are in rem so they follow the reader's text-size setting.

### Named Rules

**The 600 Ceiling Rule.** Text tops out at 600. 700 is reserved for score numerals; nothing anywhere is heavier.

**The Tabular Number Rule.** Calories, counts, dates, scores and nutrition use tabular figures so columns of numbers hold still.

## Layout

A single column on phones that widens to a centred container (`max-w-6xl`, 72rem) with 16px side padding (24px from 640px). The menu narrows to 64rem, Your list to 48rem. The header is 64px and sticky; on phones a five-item tab bar is fixed at the bottom with safe-area padding, and on 768px and up it is replaced by inline nav in the header.

The menu's controls stack in a fixed order: hall segmented switch, day strip, meal tabs, a status line, then search and filter chips, then the picks shelf, then station cards. Station jump pills stick under the header. From 1024px station cards flow into two balanced columns; Today's hall cards sit three across from 768px.

Spacing rhythm is a 4px base: 4 and 8 inside controls, 12 between tiles and row elements, 16 for card padding and side gutters, 24 to 32 between sections (station cards are 28px apart), 48 for page top padding on wider screens. Horizontal rows (picks shelf, day strip, chips, station rail) bleed to the screen edge on phones and scroll with snap and hidden scrollbars.

## Elevation & Depth

Depth is tonal first. Cards are a step lighter than the ground in dark mode, and a white card on a light-grey ground in light mode, each with a 1px `card-line` border. In light mode cards add one soft, ambient two-layer shadow; in dark mode the shadow token is `none` and the tone step does the work. The header and tab bar are a translucent material (86% ground with 20px blur and 180% saturation), which falls back to the solid ground under `prefers-reduced-transparency`. Sheets sit over a scrim (40% black light, 60% dark).

### Shadow Vocabulary

- **Card** (`box-shadow: 0 1px 2px rgb(0 0 0 / 0.05), 0 6px 16px -6px rgb(0 0 0 / 0.08)` light, `none` dark): station cards, pick tiles, hall cards, sheets, the account menu, the active hall in the switch.

### Named Rules

**The Tone Not Shadow Rule.** In dark mode a surface is raised by stepping `bg` to `surface` to `surface-2`, never by adding a shadow.

## Shapes

Soft, consistent, app-native rounding. Containers that hold content are 18px (`card`); sheets are 24px on top (all four corners when centred on wider screens); inline grouped panels such as the nutrition grid, inputs and day cells are 12px; notices and the account menu 14px. Anything you tap as a single control (buttons, chips, search, the hall switch, station pills, the avatar, score rings) is a full pill or circle. Inside a card, rows are separated by a 1px hairline and the card clips them (`overflow: hidden`), so the first and last rows inherit the card's corners.

## Components

### Buttons

Calm, pill-shaped and confident.
- **Shape:** full pill (9999px); minimum height 44px (48px at large size).
- **Primary:** `brand` fill, `brand-ink` text, 600 weight, 24px horizontal padding. Hover brightens 10%, active dims 5%.
- **Secondary:** `surface-2` fill, `ink` text; hover to `surface-3`. Used for "Add to my log", "Sign in" and "Official site".
- **Ghost:** no fill, `ink-muted` text, `surface-2` on hover.
- **Danger:** `surface` fill, `danger` text, hairline border, `danger-soft` on hover.
- **Motion:** 200ms on `cubic-bezier(0.25, 0.1, 0.25, 1)`; every button scales to 0.98 on press. Disabled is 50% opacity.

### Chips

- **Style:** full pill, 44px tall, 16px padding, `surface-2` fill, `ink-muted` 600 text, optional 16px leading icon.
- **State:** pressed flips to an `ink` fill with `bg` text and exposes `aria-pressed`. Filter and allergen chips share this.

### Cards / Containers

- **Corner Style:** 18px.
- **Background:** `surface`.
- **Shadow Strategy:** the Card shadow in light, none in dark (see Elevation & Depth).
- **Border:** 1px `card-line`; rows inside divided by 1px `line`.
- **Internal Padding:** 16px.

### Inputs / Fields

- **Style:** 48px tall, 12px radius, `surface` fill, 1px `line-strong` border at 60% (full on hover), 17px text, `ink-subtle` placeholder. Labels sit above at 15px 600.
- **Focus:** border and a 2px ring in `brand-text`.
- **Error / Disabled:** `danger` border with the error text below at 15px 500; disabled at 60% opacity.
- **Search pill:** the menu search is a 44px full pill in `surface-2` with a leading search icon and a clear button.

### Navigation

- **Desktop header:** logo, then 15px nav items in `ink-muted` 500; the active item is `ink` 600 with a 3px `brand` bar along the header's bottom edge. Theme toggle (sun or moon, 44px circle) and the account menu sit right.
- **Mobile tab bar:** five items, 56px tall, 22px icon over a 13px label; active is `brand-text` with a heavier icon stroke.
- **Hall switch:** a full-pill segmented control in `surface-2`; the active hall is a `surface` pill with the card shadow and a hairline ring.
- **Day strip:** 48px cells (short weekday over the date); the selected day is an `ink` fill with `bg` text, 12px radius.
- **Meal tabs:** text tabs on a hairline baseline; active is `ink` 600 with a 3px `brand` underline.

### Score Ring (signature)

A circle with a 2px border (3px at large) and a bold tabular numeral, both tinted by tier: `score-high` from 6.8, `score-mid` from 3.4, `score-low` below. Sizes are 40px in rows and tiles, 48px in the sheet and 112px for the result of a ranking, which lands with a lively spring. A perfect 10.0 steps the numeral down a size. Screen readers hear "Campus score 6.9 out of 10".

### Picks Shelf (signature)

A titled row ("Lunch picks") with a quiet count note on the right, then tiles 248px wide (224px from 640px) that snap as you swipe, with the next tile always peeking. A tile is a card holding a 13px station name, a 17px 600 dish name clamped to two lines, an optional two-line description in the dining team's own words, and a foot with calories and the score ring. Tiles scale to 0.98 on press.

### Dish Row and Station Card

A station is a 20px 600 name with a tabular count, over one card of dish rows. A row is at least 56px with 16px padding: the dish name at 500, an optional muted 13px second line (your score, diet words, calories), then the ring or calories, then a chevron. Hover is `surface-2` and active is `surface-3`. Four dishes show at first; "Show N more" is a `brand-text` row. Sides and sauces fold into a final row.

### Dish Sheet

A bottom sheet on phones (24px top radius, grabber, springs up) and a centred dialog from 640px. In order: title and a muted description line, description, campus and personal score rings, a four-column nutrition grid in a 12px hairline-divided panel, "Contains" allergens, a folding ingredients list, then "Rank this dish" (primary) and "Add to my log" (secondary). Escape and the scrim close it; focus is trapped and returned.

### Status and "New"

Hall status is a 600-weight word: "Open until 10 PM" in `open`, "Closing soon, 10 AM" in `warn`, "Closed, opens 4 PM" in `ink-subtle`. "New" is a 13px 600 word in `ink-subtle` riding inline after the dish name, never a badge or a filled tag.

## Do's and Don'ts

### Do:

- **Do** default to dark and read every colour through its role token so the light appearance follows automatically.
- **Do** put a station's dishes in one 18px card with hairline row dividers, and let every row open the dish sheet.
- **Do** show the number inside every score ring, tinted by tier at 6.8 and 3.4.
- **Do** keep coral red to primary buttons, the active tab indicator, links and the focus ring.
- **Do** write status as words ("Open until 10 PM"), tinted `open`, `warn` or `ink-subtle`.
- **Do** keep every tap target at least 44px and every pill fully rounded.
- **Do** use `cubic-bezier(0.25, 0.1, 0.25, 1)` for state changes and the springs only for sheets settling and a score landing; respect reduced motion and reduced transparency.

### Don't:

- **Don't** use weights above 600 for text; 700 is only for score numerals, and 800 or 900 never.
- **Don't** fill a card, section or header with coral red, or use it as a status colour.
- **Don't** make "New" a filled badge, pill or coloured tag.
- **Don't** let colour alone carry a score, status or selection; pair it with the number, the word or `aria-pressed`/`aria-current`.
- **Don't** bring back the poster devices this world replaced: run-in text, billing-sized type (the unused `headliner` and `support` sizes), or caps-and-tracking labels.
- **Don't** add shadows in dark mode; raise with a tone step instead.
- **Don't** use `plate*` or `g1` to `g9` in new code; they are legacy aliases.
