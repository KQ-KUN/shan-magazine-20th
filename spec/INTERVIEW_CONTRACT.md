# Interview Input Contract v0.1
本轮只定义 Interview 模块接口。
## 测试样本
article_id: `interview_shao`
source_file: `manuscripts/01_interview_邵珠瑜_贾锦阳.docx`
parent: `B-INTERVIEW`
## Word 段落结构
允许：ArticleTitle、ArticleSubtitle、Author、Metadata、InterviewQuestion、InterviewAnswer、Caption（可选）。
本轮样本不要求图片。
## 模块行为
1. 只读取一个明确指定的 DOCX，不扫描 manuscripts 目录。
2. 保留原文。
3. 按 `spec/WORD_STYLE_MAP.md` 将 Word Paragraph Styles 映射到既有 InDesign Paragraph Styles。
4. 页面使用 B-INTERVIEW Parent。
5. 正文文本框位于现有 margins 内，优先复用 Foundation 的 O_Text_Main / 网格逻辑。
6. 内容超页时自动创建后续页面并串联 text frames。
7. 报告 overset、missing style、unknown Word style。
8. 不根据语义、问号、说话人前缀重新分类。
9. 不导入/设计图片，不创建拉页、引语大字等特殊视觉。
10. 本轮只验证“Word结构 → InDesign样式 → 自动续页”的采访积木，不视为最终采访视觉定稿。
