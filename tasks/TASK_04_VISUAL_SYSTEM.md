# TASK 04 — Base Visual System v0.1
READ ONLY:
- AGENTS.md
- spec/MAGAZINE_SPEC.md
- spec/VISUAL_SYSTEM.md
- spec/VISUAL_TOKENS.json
- workflow/MODULE_STATUS.json
- references/VISUAL_BOARD_APPROVED.png（只作气质参考；不要从图中猜数值）
- frozen Foundation / Chapter / Interview 仅按需调用
- tasks/TASK_04_VISUAL_SYSTEM.md
Foundation、Chapter、Interview 均已 FROZEN。不得修改其文件。
## Goal
建立独立视觉覆盖层，解决当前默认字体、文字过密、页眉页脚缺失的问题，同时保持冻结结构不变。
Create:
- `visual/tokens.jsx`
- `visual/typography.jsx`
- `visual/running_system.jsx`
- `visual/chapter_skin.jsx`
- `visual/interview_skin.jsx`
- `visual/apply_visual_system.jsx`
- `build/04_visual_system_test.jsx`
- `tests/visual_system.test.js`
- `tests/VISUAL_SYSTEM_ACCEPTANCE.md`
Update:
- `workflow/MODULE_STATUS.json` 新增 `visual_system`，状态为 `IMPLEMENTED_PENDING_IND2026_TEST`、`runtimeTested:false`、`frozen:false`。
## Required
1. 严格读取 `VISUAL_TOKENS.json`，不要自行调整数值；
2. 在运行时给现有 Paragraph / Character / Object Styles 写入批准的字体、字号、leading、tracking、颜色、段距；
3. 字体按批准 fallback 栈检查；不能静默换成未批准字体；
4. 设定 C_PAPER / C_TEXT / C_MUTED / C_SDU_RED / C_LINE / C_ARCHIVE 的视觉原型 RGB；
5. `C_SDU_RED` 标记为 provisional，禁止写最终 CMYK；
6. Running System 通过独立 visual 层添加，不修改 `core/parents.jsx`；
7. H-CHAPTER / I-FRONT 不显示 Running Header/Footer；
8. Chapter 只增加低干扰细线/等高线式 motif，不做满版背景；
9. Interview 不创建肖像框、不放人物头像占位；
10. Interview 的 Q/A 样式按 token 拉开节奏，避免当前文字墙；
11. 不硬编码采访页数，不通过缩小字号压回 3 页；
12. 所有新建/修改 JSX 使用 UTF-8 BOM；
13. 不修改任何 FROZEN 文件。
## Build test
`build/04_visual_system_test.jsx` 应生成一个测试文档，至少包含：
- 1 个 Chapter 示例页（可用“火种”）
- 2—4 页 Interview 样式压力测试/或复用邵珠瑜样本片段
- 可见 Running Header / Footer
- 无 portrait placeholder
该测试只用于视觉系统验收，不替代最终整刊。
## Forbidden
- 修改 frozen Foundation / Chapter / Interview；
- 重新设计目录；
- 新增星云/宇航员/赛博元素；
- 使用未批准字体；
- 修改正文内容；
- 做最终 CMYK；
- 进入 Fiction/Memoir/History；
- 自动加入人物头像。
## Git
开始前检查 git status / MODULE_STATUS；完成后运行现有回归测试、Visual System 自动测试和必要宿主编译测试；检查 `git diff --check`；确认 frozen 文件零变化；创建独立 commit 并 push。不要冻结 Visual System，等 InDesign 2026 实机视觉验收后再冻结。建议 commit：
`feat: add base visual system`
回复不超过8行：commit、文件、字体检测结果、测试、TODO、InDesign入口。
