# TASK 19 — 正式目录与前置页物理页序

仅处理前置页次序、编辑页左右边距、正式目录和实际页码数据；保留 TASK18 已验证的新增稿件及用户章节小字。正文模块、图片、源稿、章节艺术设计、封面和28个 FROZEN 文件不变。

## 当前实际物理页序

| 内页 | 内容 | 侧面 | Review 页序 |
| --- | --- | --- | --- |
| 1 | 山口 | RIGHT | 3 |
| 2 | 写在《山》前 | LEFT | 4 |
| 3 | 山东大学学生科幻协会简介 | RIGHT | 5 |
| 4 | 编辑委员会／特别鸣谢／刊物信息／版权与使用说明 | LEFT | 6 |
| 5 | 正式目录 | RIGHT | 7 |
| 6 | 火种 transition | LEFT | 8 |
| 7 | 火种 opener | RIGHT | 9 |

编辑页与目录处于同一真实 spread。封一沿用锁定 PDF；封二无 Parent、无对象、无墨迹，完全白。内页 folio 连续从1开始，Review 的封一+封二使页序偏移2。

## 目录数据与生成

- `content/TOC_MANIFEST.json` 只保存作者/显示标题、排除规则和分栏偏好，无最终页码。顺序来自当前 Assembly manifest。
- `modules/toc.jsx` 收集已完成章节与文章：当前21项，4个未完成占位不进入目录，不给虚假页码；友协祝福、编后记、独立致谢及获奖/发表副信息不进入目录。
- 实际总装先放置全部真实 document pages，再从页面 `name` 解析组件 `start_page/end_page`；正式 TOC 在随后生成。目录使用本次实际组件范围，章节指向 recto opener，transition 不收录。
- `resolve_print_v4.py` 只为总装预留页数并计算 parity；其预测范围不作为目录绘制数据。TOC 容量由 InDesign 实际文字行测量，优先1页，最多2页；容量变化触发最多两次总装重算，不手填最终页码。
- `P_TOC_Article` 8.8pt/12.6pt，作者7.5pt/10pt，双栏73mm／6mm gutter，暖白、炭黑、SDU红，大中文序号、独立右侧数字轴，无长串点线／卡片。
- 每个独立 native frame 保留 component label 与精确预期字面内容，并验证无 overset、真实页面归属及可见行。

编辑页继续使用原 source/renderer/skin，33段逐段相等、SHA不变、SFA10422不变；与批准旧页PDF逐字/字体/字号/Y核验完全一致，仅 X 从右页内边距到左页外边距移动 -3mm。

## 入口与检查

完整入口 `tools/run_print_book.ps1 -Mode Book` 自动分派最新 V4；也可直接 `tools/run_print_v4.ps1`。两者复用项目已有批准组件 PDF 缓存，保留正文图文几何。V0 manifest 的 `excluded_for_v0` 是旧 V0 草稿说明，不控制新的 V4 正式目录。

宿主顺序：

1. `build/24_front_matter_test.jsx` — 左页编辑页 / 右页目录独立样板；样板页码来自此前真实 V3 runtime，最终总装从自身实际范围刷新。
2. `tools/resolve_print_v4.py` — 锁定正文页数、预留目录、自动 parity。
3. `build/26_print_v4_folios.jsx` — 授权数字页脚图层。
4. `tools/prepare_print_components.py --v4` — 生产副本精确核验。
5. `build/25_print_book_v4_test.jsx` — 实际总装及正式目录。
6. `tools/finish_print_pdfs.py --v4` — 正文 PDF 字符/资源流完整保留，原生目录及章节艺术保留。
7. `build/27_print_v4_postflight.jsx` — 链接更新、保存、真实页面 focus、原生跨页 PDF。

本轮冷启动第一次 COM 返回 `80080005`；确认程序未运行后正常启动已安装的 InDesign，再连接成功。未修改注册表、未关闭无关文档，脚本没有因此删减断言。

## 实际验收 2026-10-05

- InDesign 2026 `21.5.1.73`：编辑页/目录 standalone、V4 Assembly、finished postflight 均 PASS。
- 73内页、75页Review、38 native spreads；目录1页、21项，编辑LEFT 4／目录RIGHT 5同spread；火种7 RIGHT，星图29 RIGHT。
- 当前实际 component start_page 与21项目录逐项一致；所有目录字面字符与PDF一致，所有原生框有可见行，overset=false。
- 全75页渲染成功，C2零印刷对象且全部白像素，章节均 recto；3mm出血与185×260mm成品、字体嵌入、链接NORMAL均 PASS。
- 63,664个原批准正文字符及几何精确核验，61,944个原正文炭黑字形为100K；源图像像素流不改，37个数字页脚为明确授权例外。
- 月曜杯幕后2页、18原段、2581字符，源文本精确相等；作品副信息、煎饼单栏图、星岳三类图保留原批准组件。
- 已实际观察编辑/目录跨页、目录单页、七章跨页联系图及全部75页缩略图；无新增明显遮挡、裁切或页序缺陷。既有正文自然尾部留白及 Review Pending 页面不在本轮重排。
- `tests/task19.test.cjs`、`tests/print_book.test.cjs`、`tests/task16.test.cjs`、History源核验/静态、`tests/task18_pdf_colors.py`、`tests/print_book_outputs.py --v4`、frozen-scope、diff check 均 PASS。

## 本地输出

`exports/print_v4/`：

- `SHAN_REVIEW_V4.pdf`、`SHAN_INTERIOR_PRINT_V4.pdf` 与对应 INDD
- `SHAN_REVIEW_SPREADS_V4.pdf`
- `SHAN_FRONT_MATTER_SPREAD.png`（LEFT编辑／RIGHT目录）
- `SHAN_TOC_PAGE.png`、`SHAN_PRINT_SPREAD_CONTACT_SHEET.png`、7张整刊contact sheets
- `SHAN_ASSEMBLY_REPORT.json`：credits_page、toc_page、toc_entries、toc_page_numbers_source、toc_validation、native逐框内容证据、physical printed/interior/review映射
- `PDF_PREFLIGHT.json`、`FRONT_MATTER_PREFLIGHT.json`、独立/总装/后处理宿主日志

输出保持本地忽略，不将PDF/INDD导出物加入Git。两个既存 Memoir probes原样保留，不进入提交。
