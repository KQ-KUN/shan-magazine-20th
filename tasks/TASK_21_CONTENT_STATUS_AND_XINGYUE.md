# TASK 21 — 内容状态、编辑姓名与星岳两页

基线：`e5adb124c748a94476ce47c226769b99b714b4bf`。保留当前工作区和两个 Memoir probes。

本轮正式移除 `origin_pending`、`now_pending`、`closing_pending`。当前唯一待稿内容为 `messages_pending`（历任社长寄语）；正式目录继续只收录完成内容。

编辑委员会以 `content/EDITORIAL_TOC_DISPLAY.json` 中8条明确的 source paragraph → display text 映射使用用户提供的岗位/姓名写法。原 DOCX、其他23条编辑段落、原有短版权显示和完整版权存档保持不变。

星岳使用 `content/TASK21_APPROVED_XINGYUE_COPY.json` 记录本轮用户原文。故事8段共608字符，CR连接的 SHA-256 为 `2886d56298f2292f08021fc485d42915cab6433e1e3df22744d604c41ec99baa`。设定解释逐项与此前批准文字相等。

明确的两页、四栏区块替代纯自动分页：
- 内页67第一栏：标题、72×108.055mm正式人物图、38mm原型图及简洁图注。
- 内页67第二栏：故事前5段。
- 内页68第一栏：故事结尾3段、设定解释、名字和外形。
- 内页68第二栏：与山大/幻协的联系、72×72mm Q版图及简洁图注。

正文10pt / 15.5pt；结尾原文引句12.5pt / 20pt，宿主确认完整一行。保持原图比例及内容，不增加设定和图注。图片均锚定专属空 Media 段落，图注同页。逐段验证28个显示段落，未取消 equality 验证。

## 范围

仅修改当前 Assembly/TOC 数据、编辑姓名显示映射及组合页 renderer、星岳数据/module/skin/tokens、V6 build/runner/resolver、必要的版本选择和测试。旧版 baseline 不变；其他正文复用批准PDF并验证所有字符与几何位置。旧测试仅识别明确授权的三项删除和星岳改版；TASK21 测试独立限定完整 delta 和提交文件 allowlist。

28个 FROZEN 文件零变化。History、Interview、Fiction、Memoir、其他 Feature、章节设计、源稿、所有图片与正封面零变化。没有新增 frozen exception，没有冻结星岳或 History。

## 验证记录

- `node tests/print_book.test.cjs`：PASS（含 TASK16/18/19/20/21、源稿/图片 hash、28个 frozen 文件、BOM/语法、范围）。
- `tools/run_print_v6.ps1`：PASS；Adobe InDesign 2026 `21.5.1.73`。
- `build/32_xingyue_test.jsx`：PASS；2页、28段、3图；无 overset、字体及链接正常；实际 document page focus。
- `build/33_print_book_v6_test.jsx` / `35_print_v6_postflight.jsx`：PASS；70内页、72 Review页、37个实际跨页；最终链接正常。
- TOC：内页4、1页、21项；页码来源为实际宿主 component ranges，Pending 排除。
- 七个章节起始页：1、5、13、21、27、63、69，全部 recto。只添加12/26/62三处必要章节过渡。
- `python tests/print_book_outputs.py --v6`：PASS；72页均渲染，字体嵌入、盒尺寸、封面 hash、空白C2、目录及原文/图片完整性通过。
- 63,437个源字符及位置核验，61,860个100K正文字符核验；图片像素流不改。
- PDF中额外检查星岳图像与文字没有相交；三张图比例、单栏边界、图注关系通过。
- Agent查看星岳两页、编辑/目录页及章节跨页联系表；未替代用户最终视觉批准。
- `git diff --check`：PASS。

运行初次遇到COM冷启动 `80080005`；进程退出后按已验证注册路径重新启动宿主，正常完成自动验证，无用户手工调试。

最终产物：`exports/print_v6/SHAN_REVIEW_V6.pdf`。完整报告和渲染联系表位于同目录；PDF/INDD不纳入源码提交。两个既有 Memoir probes 原样保留并排除提交。
