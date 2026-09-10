# 《山》视觉参考拆分索引 v1.0

目的：减少 Codex/Astra 的视觉理解成本。不要让它每轮都读整张视觉展板，只读取当前任务对应的单张参考图。

## 使用原则
- 数值真源仍是 `spec/VISUAL_TOKENS.json`。
- 图片只负责说明“气质、层级、疏密、构图关系”，不得从图片中猜尺寸、色值、字体名称或精确坐标。
- 每个 TASK 只读取下表中必要的 1—3 张图片。
- 未被当前 TASK 点名的参考图不要读取。
- 第二张访谈概念图中的人物肖像方案已废弃；仅保留无人物的 Q/A 版式参考。

## 文件索引

### REF_01_running_header_footer.png
用途：页眉、页脚、细线、页码与信息层级。
适用：Running System / Parent Page 视觉覆盖。
重点：极轻、克制、细线、外侧页码。
不要：粗色块、复杂边框、装订侧页码。

### REF_02_typography_hierarchy.png
用途：标题、正文、英文标签、章节编号的相对层级。
适用：Typography。
重点：宋体主叙事 + 黑体信息层 + Mono 数字/档案。
不要：从图中猜具体字号，具体数值以 tokens 为准。

### REF_03_chapter_opener_example.png
用途：章节扉页的留白与构图关系。
适用：Chapter Skin。
重点：大留白、章节编号、中文章名、英文名、短前言、低干扰山体线稿。
不要：满版星空、复杂背景。

### REF_04_graphic_motifs.png
用途：等高线、地层、星图节点等图形语言。
适用：Visual motif library。
重点：0.25pt 左右的低干扰细线感；图形只作为结构提示。
不要：铺满正文背景。

### REF_05_color_palette.png
用途：综合色彩气质。
适用：Swatches / Visual prototype。
注意：最终印刷 CMYK 仍以后续确认值为准，图中只用于视觉感受。

### REF_06_cover_language.png
用途：封面方向。
适用：未来 Cover Task。
当前 Visual System Task 不必读取。
重点：暖纸底、山字/山体、等高线、少量暗红强调。

### REF_07_seven_chapters.png
用途：七章图形语汇差异。
适用：未来章节识别系统。
当前 Visual System Task 可不读取，除非实现 Chapter motif。
重点：同一系统内微差异，不做七套完全不同的视觉风格。

### REF_08_interview_qa_no_portrait.png
用途：采访正文 Q/A 疏密、问答层级。
适用：Interview Skin。
重点：问题明显、回答舒展、段落之间有呼吸、右侧可保留小型信息/引语区域。
明确：不要人物肖像，不建立头像占位框。

## 当前 TASK 04 最小读取集合
只需：
1. `REF_01_running_header_footer.png`
2. `REF_02_typography_hierarchy.png`
3. `REF_03_chapter_opener_example.png`
4. `REF_08_interview_qa_no_portrait.png`

只有需要实现 motif 时再读取：
5. `REF_04_graphic_motifs.png`

不要读取：
- REF_06_cover_language.png
- REF_07_seven_chapters.png
除非 TASK 明确要求。
