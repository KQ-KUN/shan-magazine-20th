# Foundation 首次实机验收

只运行 `build/01_foundation.jsx`。本清单不需要稿件，不导入任何正文或图片。

- 原有文档未变，新建未保存文档；初始一页，未创建七章或目录页面。
- 文档 185 × 260 mm，对页；四边出血均为 3 mm。
- 初始页和所有 Parent Pages 的上/下/内/外边距分别为 17/20/18/15 mm，6 个模块列，栏距 6 mm。重点在左右母版检查“内”确实靠书脊。
- 存在全部 7 个逻辑色板；仅 C_SPECIAL_BLUE 有批准值 #81C7D4。其他默认显示色不能作为成品颜色使用。
- 存在规格列出的 23/7/9 个段落/字符/对象样式；宿主内置样式不计数。
- P_Body_CN 为 9.5 pt / 15 pt；O_Text_Main 为双栏、6 mm 栏距，关联 P_Body_CN。
- 仅存在 A-TEXT、B-INTERVIEW、C-HISTORY、D-FICTION、E-MEMOIR、F-GALLERY、G-MESSAGE、H-CHAPTER、I-FRONT 共 9 组双页母版。
- A–G、I 各有左右两个自动页码框，均在外侧下方；H 没有页码。页码文本是自动标记而非写死的数字；在初始文档页显示当前页码。
- 页码段落使用 P_Page_Folio、无局部字体/字号格式化。检查是否因本机默认字体产生溢出；精确字体和基线待后续批准。
- 弹窗如实列出未决设计参数。重复运行产生独立新文档，不向旧文档累加样式或母版。

若出现 API 错误，记录首个错误消息和行号，仅修复 Foundation；未确认的 API 必须标记 `// TODO: VERIFY INDESIGN API`，不猜测补写。
