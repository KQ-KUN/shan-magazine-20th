# TASK 16 — 作品副信息、回忆录单栏图与星岳

本轮基线：`49ac92e1fb2084381b7cc658305dc53f7a18bb7c`。用户只授权三篇作品副信息、《煎饼回忆录》图片布局及星岳页面与 Assembly 接入。

## 实现边界

- `modules/publication_refinements.jsx` 在冻结 renderer 之后应用展示修改；不修改任何 FROZEN 文件、共享视觉 token、History、封面或原正文。
- 三项指定作品信息分别插在既有作者段之后，使用原 `P_Metadata`：7.8pt、`C_MUTED`，低于24pt主标题。宿主逐字符确认原 story 仅增加这一段。
- 《煎饼回忆录》原提交 DOCX 的257×350 PNG 原字节提取，替代旧透明跨栏 canvas；25mm宽、约34.05mm高，Media/Caption 只在本篇应用单栏 override。原 CLEAN manuscript 不含嵌入图片，正文及既有图注保持逐字符一致。
- 星岳使用用户指定正文，26个展示段落（含3个独立图片锚段）；原 DOCX 与3张PNG均有SHA-256审计。原型图38mm、人物44mm、表情包32mm，保持比例，不重绘、不裁切。正文与三类图片交错，占1页。
- 星岳在“此刻”现有文章后、`now_pending` 前；其他协会现状占位继续保留。
- 两个既有 Memoir probes 保持原样，排除提交。

## 实际验证（2026-10-04，InDesign 2026 / 21.5.1.73）

- `tools/run_task16_standalone.ps1`：3 Fiction + 2 Memoir + XingYue 均PASS。页数依次8、7、12、5、2、1；无overset，字体、链接与实际页面focus正常。
- 《煎饼回忆录》旧PDF 3页，新PDF 2页；末段完整可见，图注跟随单栏原图。新图比例及原始图像哈希通过。
- 星岳全部批准正文逐段等值、3张原图哈希及图注同页通过；无表情包单独尾页。
- `tools/run_assembly_v0.ps1`：26组件PASS，71内页、72 Review页；星岳内页67 / Review第68页。5个Pending与3个有意空白页保留。
- `tests/assembly_v0_outputs.py`：全部72页渲染、页数、185×260mm成品尺寸、页码范围、正封面与有意空白校验PASS；六张contact sheets已检查。
- `tests/task16_outputs.py`：三项作品副信息、回忆录单栏图、星岳批准全文与图片、此刻位置与保留Pending均PASS。双栏PDF按字形中心分栏，避免悬挂标点被重复抽取；PDF位置空白仅用于PDF检查，不用于源文等值。标准PDF导出会下采样高分辨率图，原始PNG字节仍在工程中保留。
- 静态：`tests/task16.test.cjs`、`tests/assembly_v0.test.cjs`、`tests/fiction_tin_sample.test.js`、`tests/fiction_transfer_sample.test.js` 均PASS。Transfer旧测试改为核对其Fiction条目，避免把后来其他模块状态新增误判为Fiction改动；冻结Fiction实现仍对tag核验。
- frozen-scope：相对上述基线，全部FROZEN文件零改动；本轮 exception 实际涉及的冻结文件数为0。原始Fiction/Memoir稿件、History、正封面哈希保持一致。`git diff --check` PASS。

## 入口与输出

- 独立验证：`build/16_content_refinement_test.jsx`
- 整刊：`build/14_magazine_assembly_v0.jsx`
- 新版阅读PDF：`exports/assembly_v0/SHAN_REVIEW_V1_TASK16.pdf`（与本轮 `SHAN_REVIEW_V0.pdf` 字节一致）
- 日志：`exports/task16/RUNTIME.json`、`exports/task16/PDF_VALIDATION.json`、`exports/assembly_v0/SHAN_ASSEMBLY_V0_REPORT.json`、`exports/assembly_v0/ASSEMBLY_PDF_VALIDATION.json`

仍为Review proof，保留未完成内容占位；本轮不冻结新模块，不进行印刷终检。
