# TASK 15 — 正式编辑页与 Interview 红线修复

## 用户授权与源文件

用户确认正式源文件所在目录为 `D:/HuaweiMoveData/Users/22974/Desktop/社刊资料`。
该目录实际文件名为 `编辑信息.docx`；纳入项目时不擅自改为 `(1)` 文件名。

- 项目源：`manuscripts/source/编辑信息.docx`
- SHA-256：`b142770ce2b5615cb4fa0c80ba6d6463470696f0bea2257f1e34914d52554297`
- 33 个原始段落（含空段），0 表格，0 图片。
- 编辑委员会、特别鸣谢、刊物信息、版权与使用说明全部保留。
- XML 为 DOCX 的原始 ZIP member；sidecar 记录段落哈希和样式索引，不保存改写正文。
- 宿主使用 BINARY 校验 XML 原始字节；逐段比较仅移除宿主的一个末尾 CR，不 trim、不纠错、不合并空段。

## Assembly delta

用 `editorial_info` 正式组件替换 `credits_pending`。
从 pending 标题移除编后记、独立致谢、友协祝福；保留历任社长寄语、未来。
保留 DOCX 内部特别鸣谢及公众号 `SFA10422`。
其他模块仍由原 renderer 导出 PDF，以 100% TrimBox 置入阅读样书。

## 有限 Frozen exception

仅授权 `visual/interview_skin.jsx` 的 `P_Interview_Q` 红线遮字修复。
例外详见 `workflow/TASK15_FROZEN_EXCEPTION.json`。

实机原始 rule above offset 为 7.37pt，小于首行 ascent 8.29pt；
高分辨率 PDF 确认红线穿过字形。Rule below、border、underline 均未开启；
导入后的 rule 与样式一致，不归因于 Word 残余 override。

仅将 `ruleAboveOffset` 设为完整 em + 2mm，并开启 `keepRuleAboveInFrame`。
不改问题文字、字号、行距、颜色、栏宽或其他冻结文件。
静态测试比较整个冻结文件，只接受明确的固定代码块，不接受任意范围豁免。

## 自验证入口

1. `node tests/assembly_v0.test.cjs`
2. `python tests/task15_outputs.py --source-only`
3. `tools/run_task15_standalone.ps1`：两篇采访、全部 26 问、实际栏/跨栏、字体/链接/overset，以及正式编辑页。
4. `tools/run_assembly_v0.ps1`：native include compile → 全部 Assembly components → proof export。
5. `python tests/assembly_v0_outputs.py`：全页 PDF structural/render smoke。
6. `python tests/task15_outputs.py`：源文绑定、26 条红线的真实像素净距、正式编辑页文字可见性、Assembly glyph geometry 与双向 raster ink coverage。
7. frozen exception scope / `git diff --check` / explicit staging 后才 commit/push。

不依赖 CJK PDF character bounding boxes 判断字形净距；这些框与实际 glyph ink 不一致。
程序按 220dpi 渲染检查红线不与黑色字形相交，且问题首行净距至少 1.5mm。
原有样书若仍打开且 modified，runner 另存带时间戳的保留副本并保持打开；不关闭无关用户文档。
两个 Memoir probes 原样保留并排除提交。本轮不冻结新模块，也不宣称送印验收。

报告与预览只写入忽略目录 `exports/task15`、`exports/assembly_v0`。

## 本机自验证结果

- InDesign 2026 / 21.5.1.73：两篇 Interview 各 3 页、各 13 问；跨栏问题分别 1 / 2 个；overset=false，字体和链接正常。
- 全部 26 条红线真实像素净距最小 2.078mm，未与字形相交。
- 编辑页 1 页；33 段（含空段）全部逐段相等且可见；DOCX/XML 原始字节哈希一致；overset=false。
- Assembly native compile/runtime PASS：25 components、内页 71 页、审阅 PDF 72 页；5 个现有 pending 占位。
- PDF structural/render smoke PASS：72 页全部可渲染；仅内页 6/26/68 为 recto 所需的已说明空白；无空白末页。
- 6 张 contact sheets 已检查，未见明显裁切或置入变形；这不替代用户最终审美及送印验收。
- 再导出会改变 PDF 子集字体的 NBSP ToUnicode 为空格，以及极小的矩阵/裁切边缘舍入。输出比较规则明确限定于 PDF，不作用于源文：字形顺序相等、x≤.4pt/y≤.12pt 位移、双向 ink coverage 允许 1 像素相位差和 1 像素裁切边缘。
- Frozen exception 仅指定 Interview skin 的两项 rule 属性；History、其他 FROZEN 文件、正封面均未改动。
