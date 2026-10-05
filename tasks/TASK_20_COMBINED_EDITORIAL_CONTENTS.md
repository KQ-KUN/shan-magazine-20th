# TASK 20 — 编辑信息与正式目录合并页

用户最新授权替代 TASK19 的独立编辑页＋独立目录页：合并为 Interior 4 / LEFT 的一页，左窄右宽，中间细竖线；只改变前置信息与必要的总装页码。正文、章节艺术、原始 DOCX、封面、全部 FROZEN 文件及既存 Memoir probes不改。

## 实际参考与版式

已读取并渲染桌面《无理数》北理工科幻社2025年纪念社刊（带祝福语版）(1).pdf 第5页目录。参考为116页；只观察其窄编辑栏、宽目录栏、竖线和信息强弱关系，不复制字体、图形或文案。

成品185×260mm、3mm出血。实际版心左15mm、右18mm，宽152mm：编辑栏47mm、间隔7mm、目录栏98mm；左栏占两栏净宽32.4%。分隔线0.5pt、58K灰，暖白纸面、炭黑正文、SDU红章节，无卡片、色条、背景图或长点线。目录标题22pt，编辑小刊头13pt，目录文章8.8pt/12.6pt、作者7.3pt/9.5pt。编辑正文7.8pt/11.4pt、短版权7.4pt/10.8pt，次级信息仍可读。

## 原文与短版权授权

原 source `manuscripts/source/编辑信息.docx` 与 source XML/audit不动。模块直接读取已验证 source 的前31段，保留原人名、字面字符、顺序和空段；逐段 exact equality。完整33段源稿仍为内容真源。

用户本次明确允许页面使用其给出的两段短版权说明，逐字保存到 `content/EDITORIAL_TOC_DISPLAY.json`；仅替代末尾两段版权的页面显示。完整原版权两段保存于 INDD metadata description、`SHAN_FULL_COPYRIGHT` label、runtime/print record，以及最终两份 PDF 的 Subject metadata。source DOCX SHA 保持：

`b142770ce2b5615cb4fa0c80ba6d6463470696f0bea2257f1e34914d52554297`

不改人名，SFA10422 保持。名单保留原批准格式和括号，不增添源稿没有的社团管理人员。

## 总装与真实目录页码

manifest 中旧 `editorial_info` 与 `toc` 合并为一个 `editorial_toc`，其余组件顺序、数据完全不变。新 renderer/skin/tokens为独立模块；旧编辑模块和原TOC模块保持原样。目录数据继续复用 `SHAN.toc.entries`，按 manifest 顺序，从本次已放置真实 document pages 的组件 start_page生成，排除本合并页自身和全部Pending。

实际内页：山口1、前言2、协会简介3、合并信息4、火种5；地层13、越岭21、星图27、此刻63、山外69。七章均RIGHT。原火种 Interior 6 transition 因页4之后自然为奇数5而不再需要；不是按省页目标删除。仅保留星图26、此刻62两处必要transition。

批准正文原始PDF缓存与原71页基线不改。本次只重算页码；17个已确认数字页脚进行授权替换，逐字/几何核验全部非页脚正文及源图片像素流，无 reflow、缩图、正文色彩变化或 Unicode归一化。

## 入口

`tools/run_print_book.ps1 -Mode Book` 自动分派当前V5，或直接 `tools/run_print_v5.ps1`：

1. source完整性 → `tools/resolve_print_v5.py`
2. `build/30_print_v5_folios.jsx` → 生产副本核验
3. `build/29_print_book_v5_test.jsx` — native Assembly及实际页码目录
4. `tools/finish_print_pdfs.py --v5` — 正文原资源流保留、完整版权metadata
5. `build/31_print_v5_postflight.jsx` — 全部链接更新、保存、实际 document page focus、跨页输出

保留失败文档和 stage/component/file/line/context 日志；不关闭无关文档。运行成功的本任务导出副本才关闭。

## 已完成自验证 2026-10-05

- InDesign 2026 21.5.1.73：原生 include/compile、71页Assembly、73页Review、37页native跨页 proof、finished links均PASS，实际document page focus，overset=false。
- 合并页第4页LEFT、只有1页；47/98mm两栏、一条竖线；所有人名、SFA10422、原前31段字面完整。
- 21项目录标题／作者／实际页码逐框精确核验，月曜杯幕后与星岳存在，4项Pending排除；章节指向真实recto opener。
- PDF全部73页可解析、可渲染；185×260mm成品、3mm出血、字体嵌入，封二零对象且完全白；无新增无意义空页。
- 合并页PDF字符与所有native frame显示字符完全一致；仅去除InDesign段落CR控制符。完整版权在两份最终PDF Subject中逐字相等。
- 63,183个批准正文字符与坐标/字号核验，61,483个炭黑字形100K；17个数字页脚为明确授权例外，正文图片像素流保持。
- 月曜杯幕后实际24—25、2页，18段/2581字符 exact，标题一次、作者/①—⑧/“便行文至此。”保持。
- 已观察实际合并单页、七张前置信息联系图、七章真实前后跨页；目录视觉主角清楚、左右信息密度有差别、无遮挡/裁切。正文模块不重新设计。
- 静态TASK20＋历史TASK18/19兼容检查、History216段/21编年/24图片/5图注完整性、PDF色彩状态回归、PDF结构与source完整性、28个FROZEN文件、diff check均PASS。

## 本地输出

`exports/print_v5/SHAN_REVIEW_V5.pdf`、`SHAN_INTERIOR_PRINT_V5.pdf` 及对应 INDD；`SHAN_REVIEW_SPREADS_V5.pdf`。

`SHAN_EDITORIAL_TOC_PAGE.png` 单页；`SHAN_FRONT_MATTER_CONTACT_SHEET.png` 按封一→封二→山口→前言→简介→合并信息→火种排序；`SHAN_PRINT_SPREAD_CONTACT_SHEET.png`。

`SHAN_ASSEMBLY_REPORT.json` 含同页 credits_page/toc_page、editorial_toc、完整版权print record、真实TOC entries和三种页码映射；`EDITORIAL_TOC_PREFLIGHT.json`、`PDF_PREFLIGHT.json` 与host日志。

文件保持在本地 exports，不提交导出物；两个Memoir probes原样保留并排除提交。
