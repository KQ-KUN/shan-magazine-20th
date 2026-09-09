# Word → InDesign 样式映射 v1.0
本文件是稿件结构映射，不是视觉设计规格。
## 通用
ArticleTitle → P_Article_Title
ArticleSubtitle → P_Article_Subtitle
Author → P_Author
AuthorRole → P_Metadata
PublicationInfo → P_Metadata
Body → P_Body_CN
Quote → P_Quote
Caption → P_Caption
Metadata → P_Metadata
## 采访
InterviewQuestion → P_Interview_Q
InterviewAnswer → P_Interview_A
## 规则
- 不通过问号猜 InterviewQuestion。
- 不通过姓名前缀重新判断段落类型；排版稿已用 Word Paragraph Style 标记。
- 不通过字号、粗体或颜色猜标题。
- Word 中未映射样式必须报告，不静默改成 Body。
- 导入后保留原文字，不改写、不删减、不总结。
