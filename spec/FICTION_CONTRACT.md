# Fiction Input Contract v1.1
本轮建立 Fiction 共用积木，只使用《四叠半》作为 Sample 1。

## Sample
article_id: `fiction_fourfold`
source_file: `manuscripts/04_fiction_四叠半_笠原JunE.docx`
parent: `D-FICTION`
author: `笠原JunE`
publication_note: `星火杯作品`

## Word Paragraph Styles
允许：
- ArticleTitle
- Author
- PublicationInfo（可选）
- Metadata（可选）
- FictionChapter
- Body
- Quote（可选）
- Caption（可选）

## Mapping
ArticleTitle → P_Article_Title
Author → P_Author
PublicationInfo / Metadata → P_Metadata
FictionChapter → P_Fiction_Chapter
Body → P_Body_CN
Quote → P_Quote
Caption → P_Caption

## Rules
1. 不通过文本内容、数字、长度、标点或正则在 InDesign 中猜章节；Word 已标记 FictionChapter。
2. 不改写、不删减、不总结稿件正文。
3. 使用 D-FICTION Parent。
4. 正文默认 2 栏，6 mm gutter，沿用全刊网格。
5. 标题/作者等 opener 信息可跨 2 栏；FictionChapter 可跨 2 栏，由 visual fiction skin 控制。
6. 自动续页并串联 story；最终必须 `story.overflows == false`。
7. unknown Word style / missing InDesign style 必须报告。
8. 给 story / frames 稳定 label，供 assembly 与测试使用。
9. 本轮不处理插图、作品专属皮肤、脚注/尾注、目录或全文组装。
10. 作者固定为 `笠原JunE`，不得从其他来源改写或替换。
