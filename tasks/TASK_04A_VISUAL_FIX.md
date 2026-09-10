# TASK 04A — Visual Acceptance Fix
目标：只修复第一次 InDesign 视觉验收暴露出的明确问题。不要重设计。

## READ
- AGENTS.md
- workflow/MODULE_STATUS.json
- spec/VISUAL_TOKENS.json（用本次提供的 v0.2 覆盖后读取）
- spec/VISUAL_SYSTEM.md
- VISUAL_REFERENCE_INDEX.md
- references/REF_01_running_header_footer.png
- references/REF_03_chapter_opener_example.png
- references/REF_08_interview_qa_no_portrait.png
- visual/typography.jsx
- visual/chapter_skin.jsx
- visual/interview_skin.jsx
- visual/apply_visual_system.jsx
- build/04_visual_system_test.jsx

不要重新读整张视觉展板。Foundation / Chapter / Interview 仍为 FROZEN。

## 已确认问题
A. Chapter：当前 `chapter_skin.jsx` 将四个字段机械平均分成四个纵向 slot，导致“壹 / 火种 / ORIGIN / 前言”彼此相距过远，看起来像结构测试而不是设计。
B. Interview：ArticleTitle 被限制在单个正文栏中，导致长标题挤成 3 行；问题段落与回答仍形成文字墙。
C. Metadata：当前整个 `P_Metadata` 使用 mono family，中文“采访时间”等出现方框缺字。v0.2 已把 P_Metadata 改为 sans_cn；Mono 只保留页码等真正数字信息。
D. Visual Test：当前弹窗没有直接显示最终 InDesign 字体选择报告，导致宿主字体验收不够直观。
E. `spec/VISUAL_SYSTEM.md` 仍残留“读取 VISUAL_BOARD_APPROVED.png”旧说明，应改为分图索引，不需要重新读取整图。

## Required minimal changes
1. 用本次 `spec/VISUAL_TOKENS.json` v0.2 替换现有 tokens；不要修改其中数值。
2. `visual/chapter_skin.jsx`：
   - 不再用 `(bottom-top)/4` 均分。
   - 严格按 `chapter_visual.layout` 定位 number/title/english/intro。
   - number 与 title 横向形成一组；中间增加 token 定义的细红色竖/斜分隔线。
   - 保持大留白。
   - 暂不做复杂等高线曲线；本轮不要为了 motif 增加复杂路径代码。
3. `visual/interview_skin.jsx` 新增通用 `applyStory(story,t)`：
   - 只根据映射后的 InDesign paragraph style name 工作，不看正文文本、不看说话人、不看问号。
   - opener styles 按 `span_opener_styles` 跨两栏。
   - `P_Interview_Q` 按 token 跨两栏。
   - Answer 保持两栏。
   - 不修改 story.contents。
   - `sample()` 在 mapStory 后、flow 前调用 `applyStory`。
   - 该 API 留给未来 assembly：Interview create 后可显式调用 skin，不修改 frozen interview.jsx。
4. 如果 InDesign 2026 的 paragraph span-columns API 名称/enum 不确定，先在宿主做最小验证；不要猜 API。若宿主不支持预期 API，报告 TODO，不构造替代文本、不修改稿件。
5. `visual/typography.jsx`：
   - 按 v0.2 应用 P_Metadata=sans_cn，解决中文 metadata 缺字风险。
   - 不增加新的未批准 fallback 字体。
6. `build/04_visual_system_test.jsx`：
   - 弹窗直接加入 `doc.extractLabel("SHAN_VISUAL_FONTS")` 的字体报告。
   - 采访样本由前4个完整Q/A组提高到前6组，只为了更容易观察跨页与密度，不是最终页数目标。
7. Running Header/Footer 当前验收方向基本通过，本轮不要重写 `visual/running_system.jsx`，除非存在阻断 bug。
8. 修正 `spec/VISUAL_SYSTEM.md` 的旧引用：Visual System 只通过 `VISUAL_REFERENCE_INDEX.md` 读取分图。
9. 把本次提供的 `workflow/TOKEN_SAVING_RULES.md` 直接加入仓库；本轮不要围绕它做额外实现或解释。
10. 所有修改/新建 JSX UTF-8 with BOM；Frozen 文件零变化。

## Acceptance
- Chapter：编号+章名形成上部同一视觉组，不再四等分纵向散开；英文紧随章名；前言位于上半页/中上部，而非贴近页底。
- Interview：首页标题能跨两栏，正常情况下不再被窄栏压成3行；Question 跨两栏形成视觉分隔；Answer 两栏流动。
- 中文 Metadata 不再显示方框。
- Running Header/Footer 保持当前克制方向。
- story text 完全不变、无 overset。
- 弹窗显示实际选中的字体或明确 MISSING APPROVED FONT。
- Foundation / Chapter / Interview frozen 源文件零变化。

## Git / reply
只做上述最小修正；运行现有回归测试、Visual System 测试及必要的 InDesign 宿主测试；`git diff --check`；确认 frozen 文件零变化。创建独立 commit 并 push，建议：
`fix: refine visual system after InDesign review`
Visual System 仍不冻结。
回复 <=8 行：commit、改动文件、span-columns 宿主结果、字体报告、测试、InDesign入口。
