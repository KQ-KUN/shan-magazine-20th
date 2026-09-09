# TASK 03 — Interview Module / Sample 1
READ ONLY:
- AGENTS.md
- spec/MAGAZINE_SPEC.md
- spec/CODEX_RULES.md
- spec/WORD_STYLE_MAP.md
- spec/INTERVIEW_CONTRACT.md
- workflow/MODULE_STATUS.json
- manuscripts/01_interview_邵珠瑜_贾锦阳.docx
- frozen Foundation files only as required
- tasks/TASK_03_INTERVIEW.md
Foundation and Chapter are FROZEN. Do not modify them.
## Goal
建立第三块积木：Interview。第一轮只使用邵珠瑜采访作为真实样本。
Create:
- `modules/interview.jsx`
- `build/03_interview_test.jsx`
- `tests/interview.test.js`
- `tests/INTERVIEW_ACCEPTANCE.md`
如需宿主验证，可新增一个最小、只针对 Interview 的原生编译/导入测试文件。
Update:
- `workflow/MODULE_STATUS.json` 新增 interview：status=`IMPLEMENTED_PENDING_IND2026_TEST`、runtimeTested=false、designValuesPending=true、frozen=false。
## Required behavior
1. 只导入指定 DOCX；
2. 保留原文，不改写、不删减；
3. 使用 B-INTERVIEW Parent；
4. 按 WORD_STYLE_MAP 做确定性映射；
5. 不通过问号、姓名前缀、粗体或字号推断段落类型；
6. 标题、副标题、作者、采访时间、问题、回答保持各自样式；
7. 正文超页时自动追加 B-INTERVIEW 页面并串联 text frames；
8. 检测并报告 overset；
9. unknown Word style / missing InDesign style 明确报错或警告，不猜；
10. 给 story / frames 加稳定 label；
11. 所有新建或修改 `.jsx` 必须 UTF-8 with BOM；
12. 不创建图片、装饰、页眉页脚新系统或最终视觉。
## Visual boundary
这是采访结构积木，不是最终视觉定稿。字体、字号、Q/A视觉差异、首屏构图、页眉页脚将在后续 Visual System 阶段统一设计。本轮禁止为了“好看”修改 FROZEN Foundation 样式。
## API rule
若 InDesign 2026 的 DOCX place/import options 或 Word Style 映射行为无法确认：先做最小宿主验证，不猜；不自建复杂 DOCX ZIP/XML parser，除非原生导入路线被实机证明不可行且用户另行批准；不引入 npm/第三方运行时依赖。
## Test
至少验证：只使用一个指定 DOCX；B-INTERVIEW Parent；预期 Word styles 全部有映射；Q/A 不是通过文本语义推断；自动续页逻辑存在；overset 检测存在；Foundation / Chapter 冻结文件无变化；JSX BOM 规则通过。
实机入口：`build/03_interview_test.jsx`
## Git
开始前检查 git status / MODULE_STATUS。完成后运行现有 Foundation、Chapter、Interview 测试及必要宿主测试；检查 `git diff --check`；确认所有 FROZEN 文件完全未变；创建独立 commit 并 push。不要 tag、不要冻结 Interview，必须等第二篇肖兆旭验证后才能冻结。建议 commit：`feat: add interview module`
回复不超过8行：commit hash、文件、测试、API/TODO、InDesign入口。
