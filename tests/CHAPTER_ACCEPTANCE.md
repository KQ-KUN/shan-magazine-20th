# Chapter InDesign 2026 实机验收

入口为 `build/02_chapters.jsx`，可经现有 Junction 在 Scripts Panel 直接运行。无需先运行 Foundation；入口调用冻结的 Foundation 公共方法建立独立测试文档，不改已有文档，不保存或导出。

- 新文档恰有 7 个结构性扉页，依 manifest 顺序为山口、火种、地层、越岭、星图、此刻、山外；没有文章、目录、额外空白页或左右页起始限制。这不是全刊最终页数。
- 7 页均应用 H-CHAPTER，均无页码；9 组 Foundation Parent 保留。
- 山口无编号文本框，其他页面编号分别为 manifest 的 1—6。中英文标题、前言逐字与 manifest 一致。
- 文本框 label 为 `SHAN_CHAPTER:<section.id>:<field>`；字段分别绑定既有 P_Chapter_Number、P_Section_Title_CN、P_Section_Title_EN、P_Chapter_Intro。全篇不做局部字体或字号格式化。
- 容器位于既有边距内、横跨六模块；四个等高区域仅用于结构测试。山口编号区域留空。检查左右页位置以及文字是否溢出；不要为解决溢出自行修改冻结样式。
- 再次运行生成独立文档，既有文档未变化。缺字段或无效 JSON 应报错，并且在建立文档前停止。

TODO: DESIGN VALUE — 章节标题字号、字体、最终位置和装饰未定义。保留现有样式与 TODO，本次不是最终章节视觉设计。Chapter 当前为 IMPLEMENTED_PENDING_IND2026_TEST，实机验收成功后再冻结；Foundation 冻结不受此 TODO 影响。

自动测试：`node tests/foundation.test.js` 与 `node tests/chapter.test.js`。测试替身验证内容、顺序、样式绑定、无页码、失败路径及 foundation-v1.0 文件一致性，不代替 InDesign 排版引擎。

API 核对：新增页面使用 Adobe [Pages.add](https://developer.adobe.com/indesign/uxp/dom/api/p/pages/) 的 LocationOptions.AT_END；[Page](https://developer.adobe.com/indesign/uxp/dom/api/p/page/) 的 appliedMaster、label、bounds、side；[Paragraphs.everyItem](https://developer.adobe.com/indesign/uxp/dom/api/p/paragraphs/) 用于整段绑定。文件通过 ExtendScript File 的 UTF-8/open/read/close 读取，JSON 使用无 eval 的 ES3 解析器。其他文档、样式、母版行为复用冻结 Foundation，不新增未核实 API 分支。

## 首次实机编译失败与编码回归

用户首次运行报告：main 引擎，modules/chapter.jsx 第 124 行，JavaScript 错误 14「No matching closing brace found」。Chapter 尚未执行。

本机 InDesign 2026 21.5.1.73 对照验证：相同完整源码经 Unicode 字符串传入引擎可编译；无 BOM 的 UTF-8 文件经原生 `#include` 加载产生错误 14；仅添加 UTF-8 BOM 后，同一文件通过原生 `#include` 编译。根因是文件加载时编码识别，并非缺括号或 JSON parser 的 ES3 语法。保留整个 parser、正则、嵌套函数与对象字面量，不改变逻辑、数据或视觉参数。

新增 `powershell -NoProfile -File tests/chapter.compile.ps1`，通过真实 InDesign COM/ExtendScript 引擎比较临时无 BOM 对照文件与仓库文件；只加载函数定义，不调用创建文档/排版函数，不读取或执行 manifest。Node 测试同时检查 BOM，防止编辑器保存时移除。编译测试已通过，但不代表 Chapter 完整排版实机验收；请重新运行 `build/02_chapters.jsx`。Chapter 保持未冻结，无新增设计或 API TODO。
