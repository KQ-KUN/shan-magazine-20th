# Cover artwork status

## Front Cover

- Status: `APPROVED`
- Source type: `EXTERNAL_ARTWORK`
- Source of truth: `assets/cover/SHAN_FRONT_COVER_FINAL.pdf`
- Assembly mode: `DIRECT_PDF_LINK`
- The historical TASK 12 JSX front-cover prototype is `SUPERSEDED_BY_EXTERNAL_ARTWORK`. Keep it for history, but Assembly must not call it to generate the front cover.
- Place the complete linked PDF artwork in InDesign. Do not reconstruct the title, subtitle, years, logo, texture, contours, or any other visual element.

Final PDF geometry:

- exactly 1 page
- MediaBox / CropBox / BleedBox: `191 x 266 mm`
- TrimBox / ArtBox: `185 x 260 mm`, inset `3 mm` on every side
- rotation: `0`

The supplied PDF was `1059 x 1486 pt` (`373.5917 x 524.2278 mm`) with no distinct trim or bleed boxes. Geometry was normalized without rasterizing: the original page content was scaled uniformly by `0.511253373782`, centered, and clipped only at the outer MediaBox by approximately `1.0066 mm` at both top and bottom. The approved composition and proportions remain intact.

Assembly must place the BleedBox at `-3, -3 mm` relative to the `185 x 260 mm` document page, preserve aspect ratio and the PDF link, and align the TrimBox to the document page. Do not silently scale or relink to the historical JSX output.

## Back Cover

- Status: `PENDING`
- Do not generate or approve a back cover from the front artwork.

## Spine

- Status: `WIDTH_PENDING`
- Wait for final page count, paper stock, and binding parameters. No physical spine width is approved.
