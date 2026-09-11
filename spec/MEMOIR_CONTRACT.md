# Memoir Input Contract v0.1
第一样本：`Gloomy Biologist Cry`
作者：`笠原JunE`
Parent：`E-MEMOIR`

## Word Paragraph Styles
- ArticleTitle
- Author
- MemoirSection
- Body
- Media
- Caption

## Mapping
- ArticleTitle → P_Article_Title
- Author → P_Author
- MemoirSection → P_Memoir_Section
- Body → P_Memoir_Body
- Media → P_Memoir_Media
- Caption → P_Memoir_Caption

## Rules
1. 只按 Word Paragraph Styles 映射；禁止根据文本、数字、标点猜角色。
2. 不改写、删减或总结正文。
3. 使用 E-MEMOIR Parent。
4. 正文 2 栏 / 6 mm gutter。
5. Title / Author / MemoirSection / Media / Caption 跨 2 栏。
6. Media 段落保留 DOCX 已嵌入的图片；不得替换、生成或删除图片。
7. Gloomy 样本有 2 张嵌入图片，位于同一 Media 段落；其后 1 个 Caption。
8. 自动续页、线程连接，最终 `story.overflows == false`。
9. unknown style / missing style 必须报告。
10. 不修改 frozen Visual System / Fiction / Interview / Chapter / Foundation。
11. 不做作品专属皮肤。
