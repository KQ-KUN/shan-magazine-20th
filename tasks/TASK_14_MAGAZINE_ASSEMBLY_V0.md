# TASK 14 — Magazine Assembly V0 / 第一次整刊样书

## Goal

生成《山》的第一次整刊阅读样书，用于检查章节顺序、左右页/章节起始、连续阅读节奏、页数分布、图片密度、空白页，并为后续 TOC 与书脊估算提供数据。

这不是最终送印版，也不是最终可编辑 master。

最高原则：

**Assembly 只组合，不重新设计。**

## Baseline

开始前只读：
1. `AGENTS.md`
2. `workflow/MODULE_STATUS.json`
3. `workflow/TOKEN_SAVING_RULES.md`
4. `workflow/INDESIGN_BUILD_RUNTIME_GUARDRAILS.md`
5. 本包 `content/ASSEMBLY_V0_MANIFEST.json`
6. 本包 `workflow/PRODUCTION_SKILL_BRIDGE.md`
7. 本包 `workflow/SELF_VALIDATION_PROTOCOL.md`

此外，本任务明确使用 `KQ-KUN/indesign-publication-production`。
如果 Skill 已安装，显式调用 `$indesign-publication-production`；
若未安装，则以只读方式读取其 `SKILL.md`、runtime guardrails、external artwork 和 validation helpers。
不要把整个 Skill vendor 进《山》仓库。

任务制作时参考 main HEAD：
`ae395b1ff6defb4f77e54213e534b1e98ab47b06`

实际执行以本地当前 `main` 为准；先检查 working tree。若存在与本任务无关的未提交修改，停止并报告，不要覆盖。

不要扫描旧 exports、参考杂志或无关稿件。

## Module policy

FROZEN，只调用不修改：
- Foundation
- Chapter
- Interview
- Visual System
- Fiction
- Memoir
- Feature
- Association Profile

Candidate：
- Front Note：只按当前版本装入，不优化。
- History：只按当前 main 装入，不继续修改图片、文字、分页。
- Cover：正封面使用 approved external artwork；旧 JSX cover 已 superseded。

本轮不冻结任何模块。

## Mandatory editorial correction

用户已经明确确认公众号为：

`SFA10422`

当前 `content/ASSOCIATION_PROFILE.json` 仍为旧值 `SFW10422`。

本任务允许且必须只修正：

`SFW10422` → `SFA10422`

这是 content-data correction，不授权修改 Association Profile 的 FROZEN renderer / skin / build。

## Assembly architecture

现有文章模块都要求 fresh Foundation document。不要修改这些 fresh-document contract。

V0 采用：

**独立 temp document 渲染 → 临时 PDF → 置入统一 interior proof**

这样保证 Frozen modules 零修改。

V0 的 assembly INDD 明确标记为：

`REVIEW_PROOF_PLACED_PDF`

不是最终可编辑母版。内容完全齐备后再做 Editable Assembly / Book V1。

## Required new files

建议新增：
- `modules/assembly_v0.jsx`
- `build/14_magazine_assembly_v0.jsx`
- `spec/ASSEMBLY_V0_TOKENS.json`
- `content/ASSEMBLY_V0_MANIFEST.json`
- Assembly V0 tests
- `tasks/TASK_14_MAGAZINE_ASSEMBLY_V0.md`
- `tools/run_assembly_v0.ps1`（本机 InDesign 2026 host-runtime runner）

允许更新：
- `workflow/MODULE_STATUS.json`：新增 `assembly_v0`，状态只可为 `IMPLEMENTED_PENDING_IND2026_TEST`
- `content/ASSOCIATION_PROFILE.json`：仅账号修正

所有新/改 `.jsx` 必须 UTF-8 with BOM。

## Local runtime outputs

用户运行 InDesign build 后生成：

`exports/assembly_v0/components/`
- component proof PDFs，不提交 Git

`exports/assembly_v0/SHAN_INTERIOR_ASSEMBLY_V0.indd`
`exports/assembly_v0/SHAN_INTERIOR_ASSEMBLY_V0.pdf`

Interior：
- facing pages
- 185×260mm
- 3mm bleed
- 不含正封面、封底、书脊

同时生成：

`exports/assembly_v0/SHAN_REVIEW_V0.indd`
`exports/assembly_v0/SHAN_REVIEW_V0.pdf`

Review wrapper：
- 第1页为 approved front cover
- 后续为 interior proof
- 只用于整本阅读
- 不作为最终印刷展开几何

以及：
`SHAN_ASSEMBLY_V0_REPORT.json`
`SHAN_ASSEMBLY_V0_REPORT.txt`

## Front cover

只使用：
`assets/cover/SHAN_FRONT_COVER_FINAL.pdf`

不得重画、改字、重导出、栅格化、重排，也不得调用旧 Cover JSX。

封底、书脊本轮完全不做。

## Interior order

严格按 `content/ASSEMBLY_V0_MANIFEST.json`。
禁止自行改变文章顺序。

已完成内容真实渲染：
- 写在《山》前
- Association Profile
- 邵珠瑜专访
- 肖兆旭专访
- History
- 越岭
- 四叠半
- 锡兵
- 传送科技逸史
- Gloomy Biologist Cry
- 煎饼回忆录
- 宇宙很大，科幻更大
- 各章节 divider

Pending 内容只生成极简占位页：
- 目录
- 编辑委员会 / 版权信息
- 最初的我们
- 2025—2026协会现状 / 活动 / 文创
- 历任社长寄语 / 友协祝福
- 未来 / 编后记 / 致谢

占位页必须写：
`CONTENT PENDING — NOT FOR PRINT`

不得自行补写正文或真正设计这些页面。

## Chapter recto rule

章节 divider 使用 FROZEN Chapter 模块，不自行重画。

火种 / 地层 / 越岭 / 星图 / 此刻 / 山外必须从 recto / 右页开始。
山口也优先 recto。

如果下一可用 interior page 是 verso / 左页：
插入一张 intentional blank，并标记：
`SHAN_ASSEMBLY:intentional_blank_before:<section_id>`

Intentional blank：
- 不显示 CONTENT PENDING
- 不放装饰
- report 说明原因
- 不视为异常空白

除此之外不得产生无理由空白页。

## Temp-module page parity

这是本任务关键点。

每个 Frozen module 在 fresh temp document 中渲染，但第一页不能永远按 standalone page 1 / recto 几何处理。

在 renderer 创建内容之前，根据 component 在 interior 中的实际目标起始页号设置 temp document 首节 page-number parity，使：
- 奇数页 = RIGHT_HAND
- 偶数页 = LEFT_HAND

必须验证 temp doc 第一页 `page.side` 与目标 assembly side 一致，确保内外边距、running system 几何正确。

如果 InDesign 2026 无法可靠设置 first-page parity：
停止该 component 并记录错误，不得以错误左右页几何静默继续。
不要修改 Frozen module 解决。

## Chapter special case

FROZEN Chapter renderer 一次生成全部7个 section page。

需要一个 divider 时：
- 独立 temp chapter doc 调现有 renderer
- 根据 section page label 找到目标 divider
- 调整 temp doc 起始页码，使目标 divider 的 page.side 与 assembly 目标 side 一致
- 只导出该 divider 页

不得修改 Chapter 的 7-section contract。

## Invocation contracts

只读以下现有 build 文件以复用“如何调用 module/skin/token/media”：
- `build/02_chapters.jsx`
- `build/03_interview_test.jsx`
- `build/03b_interview_xiao_test.jsx`
- `build/05_fiction_test.jsx`
- `build/05b_fiction_tin_test.jsx`
- `build/05c_fiction_transfer_test.jsx`
- `build/06_memoir_test.jsx`
- `build/06b_memoir_pancake_test.jsx`
- `build/08_feature_beyond_ridge_test.jsx`
- `build/09_feature_now_test.jsx`
- `build/10_front_note_test.jsx`
- `build/11_association_profile_test.jsx`
- `build/13_history_test.jsx`

不要复制并分叉 Frozen renderer 逻辑。

## Component PDF export

临时 component PDFs 仅用于 V0 composition。

要求：
- 保持矢量/文字
- 不主动栅格化
- Trim 185×260mm
- composition 按 TrimBox 置入
- 不提交 Git

不要依赖英文名称 PDF preset。
若无法可靠使用宿主 PDF export API，报告 stage 并停止；不安装第三方依赖。

## Interior proof composition

`SHAN_INTERIOR_ASSEMBLY_V0.indd` 每页置入对应 component PDF page。

要求：
- 100% 等比
- 对齐 185×260mm Trim
- 不裁正文
- 不重新排字
- page label 写 component id + source PDF page
- 不叠加新的正式视觉设计

## V0 folio

V0 页码仅用于阅读检查，不是最终页码。

尽量通过 temp component 的 target page-number start/parity 使 Current Page Number marker 对应 V0 interior page sequence。

若某个模块无法安全统一 folio：
- 不修改 Frozen renderer
- report 标记 `TEMPORARY_OR_UNRESOLVED`
- 只要 side/margin geometry 正确，不阻止 V0

最终 TOC / folio 在 Editable Assembly V1 统一。

## Visual integrity

Assembly 不得：
- 改字号/行距
- 改图片大小
- 重新分栏
- 改 History 尾页
- 为压页数重新排模块
- 修改文章内容

发现问题只写入 report，不在本任务顺手修。

## Report

`SHAN_ASSEMBLY_V0_REPORT.json` 至少记录：
- mode
- interior_pages
- review_pages_including_front_cover
- 每个 component 的 id / kind / status / start_page / end_page / page_count / start_side / source / overset
- pending
- intentional blanks
- warnings
- folio_status
- frozen_scope_changed

这份报告以后要能直接用于 TOC、章节起始检查和书脊页数估算。

## Runtime diagnostics

严格遵守 `workflow/INDESIGN_BUILD_RUNTIME_GUARDRAILS.md`。

至少记录 stages：
- load-manifest
- validate-sources
- editorial-correction-check
- render-component:<id>
- export-component:<id>
- compose-interior:<id>
- save-interior
- export-interior
- compose-review-cover
- compose-review-interior
- save-review
- export-review
- write-report

错误必须包含 component id。
不得裸 rethrow 覆盖原始错误。
结束时 focus 实际 review document page，不得停在 Parent spread。

## Static tests

至少验证：
- manifest schema/order
- 所有 completed source 存在
- approved front cover 存在
- `SFA10422` 已应用
- Association Profile source 不再使用 `SFW10422`
- no FROZEN file changes
- no old Cover JSX call
- new JSX BOM
- placeholders 只对应 pending manifest items
- back cover/spine 未生成
- no manuscript edits
- `git diff --check`

静态测试不能宣称 InDesign runtime 成功。

## Codex 必须自验证

**本轮允许并要求 Codex 自己启动/连接本机 InDesign 2026 做 host-runtime 验证。**
上一版“不要启动 InDesign / COM / GUI”的限制在 TASK 14 R2 中明确取消。

严格执行：
`workflow/SELF_VALIDATION_PROTOCOL.md`

实现后必须自己：
1. 跑 static tests；
2. 通过 PowerShell/COM runner 在真实 InDesign 2026 中执行 Assembly build；
3. 若报错，读取 stage/component runtime log，自行最小修复并重跑；
4. 直到 host runtime PASS；
5. 再检查生成的 INDD/PDF/report；
6. 用 `indesign-publication-production` 的 frozen-scope / PDF artwork 检查思想与 helper；
7. 全部通过后才 commit/push。

不要把未经 host runtime 的版本交给用户点击排错。

如果当前 Codex 主机无法访问 InDesign COM，必须在 commit 前停止并报告 `HOST_RUNTIME_BLOCKED`，不能声称任务完成。

## Git

默认不要提交 `exports/assembly_v0/` 运行产物。

**commit gate：**
- static PASS
- host runtime PASS
- PDF structural PASS
- frozen-scope PASS
- `git diff --check` PASS

全部通过后建议 commit：
`feat: add self-validated magazine assembly v0`

不要 tag，不冻结。

## Final reply <= 8 lines

只回复：
1. commit hash
2. Assembly 新增/修改文件
3. `SFA10422` 修正状态
4. interior manifest component count
5. frozen-scope
6. static tests
7. InDesign 入口 `build/14_magazine_assembly_v0.jsx`
8. 预期本地输出文件名

不要要求用户手动启动或点击 InDesign 来替你排错；按 SELF_VALIDATION_PROTOCOL 由 Codex 自动执行宿主验证。
