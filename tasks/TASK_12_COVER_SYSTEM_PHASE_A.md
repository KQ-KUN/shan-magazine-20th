# TASK 12 — Cover System / Phase A

## Objective
Create the first real cover-system prototype for 《山》:
- front cover
- back cover
- spine content/typography rule
- no final physical spine width

## Important
Do NOT launch Adobe InDesign / COM / GUI just to validate.
The user will run the generated JSX and export PDFs.

## Read only
- root `AGENTS.md`
- `workflow/TOKEN_SAVING_RULES.md`
- existing frozen visual-system interfaces/tokens as needed
- `content/COVER_COPY.json`
- `spec/COVER_SYSTEM_PHASE_A_DESIGN.md`
- provided SDUSFA logo asset

Do not read unrelated manuscripts, History sources, Feature/Fiction/Memoir content, or reference magazines.

## Frozen scope
Do not modify any currently FROZEN file/module.
Do not modify global Visual System values.

## Implement
Prefer a new isolated cover system:
- `modules/cover_system.jsx`
- `visual/cover_system_skin.jsx`
- `spec/COVER_SYSTEM_TOKENS.json`
- `build/12_cover_system_test.jsx`
- minimal tests

If project conventions suggest another equivalent naming scheme, keep scope equivalent.

## Output of build
Create a prototype document containing:
- page 1: front cover, 185×260 mm
- page 2: back cover, 185×260 mm
- no physical spine page
- document bleed: 3 mm

The two pages are prototype surfaces only; final wraparound cover comes later.

## Front cover copy
Read from JSON:
- 山
- 山东大学学生科幻协会二十周年纪念刊
- 2006—2026
- optional SHAN only if enabled and visually justified

Do not invent any other copy.

## Back cover copy
Read from JSON:
- 山东大学学生科幻协会
- 微信公众号：SFW10422
- actual SDUSFA logo

Do not render a QR code in Phase A.
Do not invent ISBN/barcode/legal information.

## Visual direction
Follow `spec/COVER_SYSTEM_PHASE_A_DESIGN.md`.

Mandatory:
- typography-led
- warm paper + charcoal + restrained SDU red
- native InDesign vector contour/strata lines only
- asymmetric composition
- no AI art
- no generic star field / nebula / planet / astronaut
- no photo collage
- front visually stronger than back
- back quieter and cleaner
- no final spine geometry

## Suggested starting geometry
These are starting points, not frozen print values:
Front:
- title `山`: 92–118 pt
- subtitle: 11–15 pt
- years: 12–18 pt
- motif lines: 0.2–0.5 pt
- retain at least 15 mm safe area from trim for critical copy

Back:
- logo 20–28 mm
- organization 10–14 pt
- WeChat 8–10 pt
- quieter motif continuation

## Runtime guardrails
Carry forward project lessons:
- distinguish document pages from Parent spreads
- explicitly focus front document page at end
- validate actual page items, not current UI view
- do not assume array-like InDesign DOM objects support `.item()`
- module-local assertions only; do not count copy globally across all `doc.stories`
- new/modified non-frozen `.jsx` must be UTF-8 with BOM

## Assertions
- exactly 2 document pages
- front contains `山`, subtitle, `2006—2026`
- back contains organization name, `SFW10422`, and visible logo
- no overset
- critical copy stays within trim safe area
- no page item extends beyond bleed except motif lines intentionally clipped to bleed
- FROZEN scope zero changes
- `git diff --check`
- tests pass

## Status
Do NOT freeze after sample 1.
This is Phase A prototype and requires user visual acceptance first.

## Git
Commit + push:
`feat: add cover system phase a`

Reply <= 7 lines:
commit
added/modified files
front page summary
back page summary
spine status
tests/frozen scope
InDesign entry
