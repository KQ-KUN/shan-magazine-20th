# 《山》Cover System — Phase A Design Direction v1.0

## Scope
This phase establishes:
1. front cover visual system;
2. back cover visual system;
3. spine typography/content rules only.

It does NOT establish final wraparound-cover geometry or final spine width.

## Physical assumptions for prototype
- Front cover: 185 × 260 mm
- Back cover: 185 × 260 mm
- 3 mm bleed on all outer edges
- No final spine width
- Use the magazine's existing warm-paper / charcoal / SDU-red language

## Core concept
The cover must express:
**山 / 地层 / 等高线 / 二十年沉积**
without becoming a generic starry-space science-fiction poster.

Avoid:
- nebula backgrounds
- planets as hero objects
- astronauts
- generic glowing sci-fi UI
- photomontage
- AI-generated illustration
- excessive archival-photo collage
- commercial event-poster composition

The cover should read first as a serious anniversary publication, second as a science-fiction association magazine.

## Front cover
### Hierarchy
1. `山` — absolute visual anchor
2. `山东大学学生科幻协会二十周年纪念刊`
3. `2006—2026`
4. optional tiny `SHAN`, only if it improves balance

### Composition
- Asymmetric, not centered poster layout.
- Large Chinese title should carry the page.
- Use Source Han Serif / 思源宋体 family for `山`, with restrained weight.
- `山` may occupy roughly 35–48% of the front-cover visual height, but must retain generous paper around it.
- Do not turn the title into a logo lockup.
- Subtitle and years should be clearly subordinate.

### Motif
Use native InDesign vector lines only:
- contour / strata lines
- 0.2–0.5 pt
- warm gray / muted ink / very restrained SDU red
- partial, cropped, entering from page edge
- should imply geological layers, not literally draw a mountain silhouette

One possible device:
- `山` sits near left-lower or center-left area;
- several contour/strata lines cross or pass behind the title at very low contrast;
- one small red registration-like marker / short rule provides the SDU-red accent.

### Color
- Warm paper base
- Charcoal/black typography
- SDU red only as controlled accent
- No gradients
- No secondary bright colors
- Do not finalize print CMYK in this phase

## Back cover
Back cover should be quieter than front cover.

Required:
- small SDUSFA logo
- 山东大学学生科幻协会
- 微信公众号：SFW10422

Optional:
- one very short contour/strata continuation from the front-cover system
- a small `2006—2026`

Do NOT add:
- body paragraphs
- activity lists
- photos
- slogans
- fake ISBN/barcode
- QR code in Phase A

The back cover should feel like the closing surface of the same object, not a second poster.

## Spine rule
Do not render a final physical spine in Phase A.
Record typography/content only.

Preferred order:
`山`
`山东大学学生科幻协会二十周年纪念刊`
`2006—2026`

When final spine is narrow, use the compact rule from `content/COVER_COPY.json`.

Final spine width must be computed only after:
- final page count;
- final interior stock;
- paper thickness/bulk;
- binding method;
- printer specification.

## Editorial quality rules
- One strong idea only.
- Typography is the hero; motif is supporting structure.
- Do not fill empty space for its own sake.
- Avoid symmetrical event-poster composition.
- Keep front and back visually related, but not mirrored.
- Use the same existing project palette and font families.
- Prototype should be easy to edit later in InDesign.

## Phase A success criteria
Front cover:
- immediately reads `山`
- clearly shows the 20th-anniversary identity
- does not look like generic sci-fi key art

Back cover:
- clean, recognizably part of the same system
- contact information readable
- no unnecessary visual noise

Spine:
- content/rule documented
- physical width explicitly pending
