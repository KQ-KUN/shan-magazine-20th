# TASK22 — V6 定向校正与星岳视觉微调

基线：b7dc705cdf6c75add65fd7e82679d0dfb7269b80。仅采访精确姓名替换和星岳既有两页视觉调整。

- 全刊只发现一处邵珠渝：肖兆旭原稿第30段，内页11 / Review13。保留上传原稿；排版副本仅替换一字，ZIP其他成员逐字节不变。逐段 DOM 与映射完整核对，不取消原文完整性检查。
- 星岳28段文字、角色与顺序与V6相同。原型移第二页，Q图宽72→86.4mm（+20%）；第一页人物比例填充窄窗口仅收掉左右背景，完整人物区域与完整原图高度在原生DOM检查。原图字节保持。
- 全部章节intro、其他文章、History、冻结文件、封面不变。
- 新V7入口36 standalone → 37 Assembly → 39 postflight；历史V6输出保留。只替换新校正采访及星岳PDF，其余已批准正文PDF复用。
- 原生与PDF验证均通过后方可提交；两个无关Memoir probes保留且不提交。

## 实际验收

- InDesign 2026 / 21.5.1.73：采访37段逐段一致，仅一字改正；星岳28段逐段一致、两页、三张原图、无 overset、无缺图或缺字体。
- Assembly：内页70 / Review72 / spreads37；章节recto与目录真实页码通过；结束时focus实际document page。
- PDF：72页均渲染，字体嵌入、图片流、源文完整性通过；最终“邵珠渝”为0。已观察六张全刊联系表、章节跨页、采访改字页及星岳两页。
- 与V6对照：其余页面逐字、字号、字体与几何位置核对。采访重新导入允许垂直基线小于0.1pt（约0.036mm）、水平小于0.006pt的宿主重组误差，其余页面维持0.06pt容差；不允许分页、换行、字号或文字变化。
- 修复导出隔离副本将live Parent / frame偏移3mm的问题：可编辑组件保持facing-page导出；整刊PDF wrapper仍复用既有隔离导出机制。未修改冻结renderer。
- 静态测试、source完整性、28个冻结文件、diff check均PASS。原DOCX与两个Memoir probes保持原样。

自动化入口：`powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/run_print_v7.ps1`。
该入口包含source检查、standalone、folio、Assembly、postflight及PDF完整验证；`tools/run_print_book.ps1`也已转到V7。
输出：`exports/print_v7/SHAN_REVIEW_V7.pdf`。未声称已达最终印厂放行；装订、印厂色彩条件及历任社长寄语仍按原状态保留。
