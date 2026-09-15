# TASK 11C — Association Profile / Scheme B anniversary ending

## Context
The latest association-profile layout is structurally acceptable.
User specifically chooses:
**Scheme B — white/warm-paper background + oversized pale-red `2006—2026` at the bottom.**

This task is a refinement, not a redesign.

## Read
- current `modules/association_profile.jsx`
- current `visual/association_profile_skin.jsx`
- current `spec/ASSOCIATION_PROFILE_TOKENS.json`
- current `build/11_association_profile_test.jsx`
- `content/ASSOCIATION_PROFILE.json`
- `spec/ASSOCIATION_PROFILE_SCHEME_B.md`
- root `AGENTS.md`

Do not read unrelated content.

## Allowed changes
Association Profile is not frozen, so you may modify its own module/skin/tokens/build/tests.
Do not modify any FROZEN module or global frozen visual-system file.

## Required changes
1. Keep the current title/info/logo/body composition.
2. Remove/omit any bottom contour-line decoration.
3. Add large pale-red `2006—2026` in the lower page.
4. Add one short thin SDU-red rule and the caption:
   `山东大学学生科幻协会　二十周年`
5. Do NOT add an activity-keyword row.
6. Keep all source body text unchanged.
7. Keep logo small: 20–24 mm, hard max 24 mm.
8. Refine body width to approx. 126–132 mm and ensure both paragraphs share the same left edge.
9. Ensure the last paragraph ends clearly above the year treatment.
10. One page only; no overset.

## Important visual rule
The bottom year treatment is the only new visual element.
Do not compensate with extra decoration.
No photos, no AI art, no star fields, no contour lines, no additional English, no slogan.

## Runtime guardrails
Keep all prior protections:
- document page vs Parent spread distinction
- explicit focus back to actual document page
- text frame assertions
- title / SFW10422 / final phrase assertions
- logo visibility and safe collection access
- logo width <=24 mm
- no overset
- UTF-8 BOM for modified JSX

## Tests
Update tests/tokens so practical checks cover:
- one page
- `2006—2026` exists exactly once
- anniversary caption exists exactly once
- no extra keyword-row strings introduced by this task
- logo <=24 mm
- body width in intended range
- copy unchanged
- FROZEN scope zero changes
- `git diff --check`

Do not launch InDesign/COM/GUI.
User will run the build.

## Git
Commit + push:
`style: add anniversary year ending to association profile`

Association Profile remains NOT FROZEN.

Reply <=7 lines:
commit
modified files
year treatment geometry
body geometry
logo width
tests/frozen scope
InDesign entry
