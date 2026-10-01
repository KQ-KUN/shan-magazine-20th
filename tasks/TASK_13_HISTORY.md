# TASK 13 — History / 地层

仅实现独立编年正文模块；不编辑正文，不做整刊Assembly，不启动InDesign/COM/GUI。

输入、两项明确授权例外及当前源文件版本见 `spec/HISTORY_CONTRACT.md`。章节沿用清单 `贰｜地层 / STRATA`，不修改清单，不新增导语。当前源已包含指定删除，导入只执行指定段落移动。

允许范围：

- `manuscripts/source/山东大学学生科幻协会会史 (2.5）.docx`（字节不变、只读副本）
- `assets/history/`（字节不变的原始XML与24原图）
- `content/HISTORY_IMPORT_MAP.json`
- `spec/HISTORY_SOURCE_AUDIT.json`、`spec/HISTORY_TOKENS.json`、`spec/HISTORY_CONTRACT.md`
- `modules/history_source.jsx`、`modules/history.jsx`、`visual/history_skin.jsx`、`build/13_history_test.jsx`
- `tests/history_source.py`、`tests/history.test.cjs`、本任务文件
- `workflow/MODULE_STATUS.json` 仅新增 History pending 条目

所有FROZEN模块、既有状态、CONTENT_MANIFEST、正封面、封底和书脊只读。保留现有未跟踪诊断文件。

自动检查：全部216主段落、空段、逐段字符相等与唯一授权换序，21编年、24图字节/顺序/锚点、5图注、源SHA-256、BOM、冻结范围及 `git diff --check`。module-scope commit/push 已获用户授权。

交付后用户手动运行 `build/13_history_test.jsx`；实际页数、overset、字体、链接、图注与图片位置和PDF视觉仍需InDesign 2026实机验收。不得在本轮冻结History或标记runtimeTested。
