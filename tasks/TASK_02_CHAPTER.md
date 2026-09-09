# TASK 02 — Chapter Module
READ ONLY:
- AGENTS.md
- spec/MAGAZINE_SPEC.md
- spec/CODEX_RULES.md
- spec/CONTENT_MANIFEST.json
- spec/INPUT_CONTRACTS.md
- workflow/MODULE_STATUS.json
- frozen Foundation files only as required for calling their public behavior
- tasks/TASK_02_CHAPTER.md
Foundation is FROZEN. Do not modify its files.
## Goal
建立第二块积木：Chapter 章节扉页模块。
Create:
- `modules/chapter.jsx`
- `build/02_chapters.jsx`
- `tests/chapter.test.js`
- `tests/CHAPTER_ACCEPTANCE.md`
Update:
- `workflow/MODULE_STATUS.json`：新增 chapter 状态，完成实现后设为 `IMPLEMENTED_PENDING_IND2026_TEST`、`runtimeTested:false`、`frozen:false`。
## Source of truth
章节顺序、名称、编号、前言只来自 `spec/CONTENT_MANIFEST.json`。
顺序必须为：山口 → 火种 → 地层 → 越岭 → 星图 → 此刻 → 山外
## Required behavior
1. 基于已冻结 Foundation 创建测试文档；
2. 为 7 个 section 各生成 1 个结构性章节扉页；
3. 使用 H-CHAPTER Parent；
4. 山口不显示章节编号；
5. 火种—山外使用 manifest 中 `chapter_index`；
6. 放置中文章节名、英文章节名、章节前言；
7. 绑定现有样式：`P_Chapter_Number`、`P_Section_Title_CN`、`P_Section_Title_EN`、`P_Chapter_Intro`；
8. 不改写 manifest 文本；
9. 给文本框加稳定 label；
10. 缺字段时报错，不猜；
11. H-CHAPTER 不出现页码；
12. 本轮不强制章节从左页/右页开始，不硬编码最终出版页码。
## Visual boundary
本轮是结构性 Chapter 积木，不是最终章节视觉设计。未定义的标题字号、字体、装饰、等高线/地层/星图图形不得自行设计，不修改 Foundation 样式，保持 TODO。可以按现有 margin / 6-column grid 创建最小结构文本框，但不得发明新的视觉系统。
## Forbidden
- 修改任何 FROZEN Foundation 文件；
- 导入文章正文；
- 创建采访、小说、会史、图库、社娘模块；
- 生成 TOC；
- 读取稿件、图片、参考社刊；
- 修改章节名称、顺序或前言；
- 硬编码最终页数；
- 添加普通宇宙/科幻装饰；
- 重构 Foundation；
- 修改未授权文件。
## Test
自动测试至少验证：section 数量=7；顺序与 manifest 一致；7 页均应用 H-CHAPTER；山口无 chapter number；其余编号=1—6；CN/EN/intro 与 manifest 完全一致；使用正确 paragraph style；无文章页面；Foundation 文件无变更。
实机验收入口：`build/02_chapters.jsx`
## Git
开始前检查 `git status` 和 `workflow/MODULE_STATUS.json`。完成后运行自动测试、`git diff --check`，检查 Foundation 文件没有变化，创建独立 commit 并 push。不创建 chapter tag，不冻结 chapter；必须等 InDesign 2026 实机验收后再冻结。建议 commit：`feat: add chapter module`
回复不超过8行：commit hash、创建/修改文件、自动测试结果、TODO、InDesign 实机测试入口。
