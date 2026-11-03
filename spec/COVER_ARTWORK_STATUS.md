# Cover artwork status

## Front Cover

- Status: `APPROVED`
- Source type: `EXTERNAL_ARTWORK`
- Current source of truth: `assets/cover/SHAN_FRONT_COVER_EMBLEM_R1.pdf`
- Previous approved cover: `assets/cover/SHAN_FRONT_COVER_FINAL.pdf` (preserved byte-for-byte for historical V8 builds).
- 2026-10-13 user-authorized exception: replace only the emblem with `现存会徽.png`, exact white-to-alpha extraction and recolor to `#856349`, without AI redraw or added letters. The old flattened emblem ink is locally repaired; all other cover pixels and the original PDF page geometry remain intact.
- Assembly mode: `DIRECT_PDF_LINK`
- The historical TASK 12 JSX front-cover prototype is `SUPERSEDED_BY_EXTERNAL_ARTWORK`. Keep it for history, but Assembly must not call it to generate the front cover.
- Place the complete current linked PDF artwork in InDesign. Do not reconstruct the title, subtitle, years, texture, contours, or any other visual element. The emblem revision is already baked into its separate versioned PDF.

Final PDF geometry:

- exactly 1 page
- MediaBox / CropBox / BleedBox: `191 x 266 mm`
- TrimBox / ArtBox: `185 x 260 mm`, inset `3 mm` on every side
- rotation: `0`

The supplied PDF was `1059 x 1486 pt` (`373.5917 x 524.2278 mm`) with no distinct trim or bleed boxes. Geometry was normalized without rasterizing: the original page content was scaled uniformly by `0.511253373782`, centered, and clipped only at the outer MediaBox by approximately `1.0066 mm` at both top and bottom. The approved composition and proportions remain intact.

Assembly must place the BleedBox at `-3, -3 mm` relative to the `185 x 260 mm` document page, preserve aspect ratio and the PDF link, and align the TrimBox to the document page. Do not silently scale or relink to the historical JSX output.

## Back Cover

- Digital status: `APPROVED_FOR_DIGITAL`
- Digital artwork: `assets/cover/back/SHAN_BACK_COVER_DIGITAL_185x260.pdf`, 185 × 260 mm, one page; direct PDF link at 100%.
- The supplied digital PDF has an explicit MediaBox only; native placement uses `PDFCrop.CROP_MEDIA`. The final electronic PDF reuses the complete original digital PDF page directly, preserving its exact clipping and image transform.
- Inside front and inside back covers are truly blank with no Parent or page items.
- Print candidate: `assets/cover/back/PRINT_CANDIDATE/SHAN_BACK_COVER_PRINT_CANDIDATE_191x266_BLEED3.pdf`.
- Print status: `PRINT_CANDIDATE_NOT_APPROVED`; explicit TrimBox 185 × 260 mm, MediaBox/BleedBox 191 × 266 mm, 3 mm bleed.
- The 1056 × 1490 px source is about 140 PPI at print width. Printer ICC, PDF/X, stock, binding and spine remain pending. No CMYK conversion or final cover spread was made.
- Source original: `assets/cover/back/sources/USER_ORIGINAL_164559.pdf`.
- The procedural back-cover prototype is superseded for this electronic edition; add no logos, wording or QR codes to supplied artwork.

## Spine

- Status: `WIDTH_PENDING`
- Wait for final page count, paper stock, and binding parameters. No physical spine width is approved.
