# Interview 样本 1 验收

入口：`build/03_interview_test.jsx`，通过现有 Junction 运行。仅使用 `manuscripts/01_interview_邵珠瑜_贾锦阳.docx`；不需要先运行 Foundation 或 Chapter。创建独立未保存文档，失败结果不得当成完成版；既有文档不修改。

## 原生验证记录

InDesign 2026 21.5.1.73 最小探针验证：`TextFrame.place(File, false)` 原生导入 DOCX，保留 Word 段落样式名。得到 41 段：ArticleTitle、ArticleSubtitle、Author、Metadata 各 1 段，InterviewQuestion 13 段，InterviewAnswer 24 段。随后 `applyParagraphStyle(target, true)` 可绑定 Foundation 样式且不改变 story.contents。不使用自建 DOCX parser，不执行稿件数据，不根据标点或姓名推断结构。

`powershell -NoProfile -File tests/interview.native.ps1` 已通过真实导入与自动续页：3 页、41 段、overset=false，问题 13 段、回答 24 段；全部 B-INTERVIEW、O_Text_Main 双栏，无图片；导入偏好恢复。该脚本只关闭其新建的临时文档，不保存。3 页仅是当前宿主默认字体条件下的观测值，不是最终页数或实现中的固定值。

API：Adobe [WordRTFImportPreference](https://developer.adobe.com/indesign/uxp/dom/api/w/word-rtf-import-preference/) 控制保留结构样式、禁用图片及智能引号替换；[ResolveStyleClash](https://developer.adobe.com/indesign/uxp/dom/api/r/resolve-style-clash/) 采用既有定义，避免覆盖 Foundation 样式。样式映射在原生导入后按确切名称逐段进行，不依赖未核实的导入对话框映射 API。续页使用 Pages.add、nextTextFrame、Document.recompose、Story.overflows，均在本次宿主测试中实际调用。

## 人工复测

- 标题、副标题、作者、采访时间和全部 Q/A 原文完整，逐段与 DOCX 核对；无删减、改写、图片或 TOC。
- 相应段落绑定 P_Article_Title、P_Article_Subtitle、P_Author、P_Metadata、P_Interview_Q、P_Interview_A；Caption 可选。未知 Word 样式和缺失目标样式明确报错，不默认为 Body。
- 每页 B-INTERVIEW，文本框在原边距内，使用 O_Text_Main 两栏与 6 mm 栏距。沿用既有 Parent 页码，不新设计页眉页脚。
- 文本框逐页串联，最终弹窗报告 overset=false。无法继续排入文字时中止并报告 overset，避免无限创建空页。
- Story label 为 `SHAN_INTERVIEW:interview_shao:story`；frame label 为 `SHAN_INTERVIEW:interview_shao:frame:<顺序>`，顺序只用于稳定标识，不是出版页码。
- 重复运行创建独立文档；全局导入偏好和脚本计量单位恢复。不要在失败的部分文档上再次续跑。

自动测试：`node tests/foundation.test.js`、`node tests/chapter.test.js`、`node tests/interview.test.js`。Node 验证错误路径、映射、续页/无进展保护和冻结文件，不能代替真实排版。

TODO: DESIGN VALUE — 字体、字号、Q/A 视觉、首屏构图与页眉页脚待 Visual System 阶段，不修改冻结模块。无未核实 API 待实现分支。Interview 保持 IMPLEMENTED_PENDING_IND2026_TEST、runtimeTested=false、frozen=false；本轮宿主测试不等于人工验收或第二篇样本验证，不打 tag。

## TASK 03B 第二样本复用验证

用户第二轮只新增肖兆旭稿。入口为 `build/03b_interview_xiao_test.jsx`，调用原样的 `modules/interview.jsx`，参数为 interview_xiao 及指定 DOCX；无专用排版逻辑。原邵珠瑜入口继续可用。

InDesign 2026 21.5.1.73 原生验证：肖兆旭 3 页、37 段，问题 13 段、回答 18 段；邵珠瑜回归 3 页、41 段，问题 13 段、回答 24 段。两篇最终 overset=false；标题、副标题、作者、Metadata 与 Q/A 全部按 Word 样式映射，B-INTERVIEW、O_Text_Main 双栏正常，无图片，导入偏好恢复。页数是观测值，不是视觉目标。第二样本未暴露通用 Bug，Interview 模块没有修改。

复现命令：`powershell -NoProfile -File tests/interview.native.ps1 -Sample xiao` 与 `powershell -NoProfile -File tests/interview.native.ps1 -Sample shao`。原生测试只关闭自身新建文档。手动复测新入口并核对全文；Interview 保持未冻结，不创建 tag，待用户确认后再单独冻结。
