# Feature Input Contract v1.0
Sample: `越岭：十七年间，山外仍有回声`
Author: `几华里`
Parent: `A-TEXT`
article_id: `feature_beyond_ridge`

## Word Paragraph Styles
- ArticleTitle
- Author
- FeatureLead
- FeatureSection
- Body
- FeatureMedia
- Caption

## Mapping
- ArticleTitle → P_Article_Title
- Author → P_Author
- FeatureLead → P_Feature_Lead
- FeatureSection → P_Feature_Section
- Body → P_Feature_Body
- FeatureMedia → P_Feature_Media
- Caption → P_Feature_Caption

## Rules
1. Only map by Word Paragraph Styles. No semantic guessing.
2. Use existing `A-TEXT` Parent. Do not create or edit Parents.
3. Body: 2 columns / 6 mm gutter.
4. ArticleTitle / Author / FeatureLead / FeatureSection / FeatureMedia / Caption span both body columns.
5. Four `FeatureMedia` slots are explicit `[[YUELING_MEDIA_0N]]` markers. Use the manifest to place the matching external image as an anchored object, then remove only that marker text.
6. Do not OCR, crop, edit, regenerate or replace the supplied archival images.
7. Thread frames / auto-add pages / no overset.
8. Do not alter article wording, author name, or the term `齐鲁科幻联盟`.
9. Do not expose the participant's real name anywhere in generated content, diagnostics or captions. Use `颜冬` wherever the article names that participant.
10. No custom skin, new palette, decorative generated imagery or complex ridge motif in this task.
