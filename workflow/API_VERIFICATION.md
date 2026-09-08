# Foundation API 核对

2026-09-08 按 Adobe 官方 DOM 文档核对。官方旧 `/indesign/dom/api/` URL 目前重定向到 UXP DOM 参考；本项目只使用共用 InDesign DOM 成员，入口为 ExtendScript `.jsx`，不使用 UXP 的 `require`、异步或模块语法。文档核对不能替代 InDesign 2026 实机运行。

- [Documents.add](https://developer.adobe.com/indesign/uxp/dom/api/d/documents/) 与 [DocumentPreference](https://developer.adobe.com/indesign/uxp/dom/api/d/document-preference/)：新文档、开本、对页、页数空壳、出血。非统一出血时先设置四边，再恢复统一开关。
- [MarginPreference](https://developer.adobe.com/indesign/uxp/dom/api/m/margin-preference/) 与 [Adobe 边距说明](https://helpx.adobe.com/indesign/desktop/create-and-organize-pages/create-documents/change-document-setup.html)：边距、分栏；对页 left/right 按 inside/outside 语义使用。
- [ScriptPreference](https://developer.adobe.com/indesign/uxp/dom/api/s/script-preference/) 与 [ViewPreference](https://developer.adobe.com/indesign/uxp/dom/api/v/view-preference/)：脚本运行使用 pt，结束恢复原设置；文档显示标尺为 mm。
- [Colors](https://developer.adobe.com/indesign/uxp/dom/api/c/colors/) 与 [Color](https://developer.adobe.com/indesign/uxp/dom/api/c/color/)：按名称创建、RGB 值、未决颜色标签。
- [ParagraphStyles](https://developer.adobe.com/indesign/uxp/dom/api/p/paragraph-styles/)、[ParagraphStyle](https://developer.adobe.com/indesign/uxp/dom/api/p/paragraph-style/)、[ObjectStyle](https://developer.adobe.com/indesign/uxp/dom/api/o/object-style/)：命名样式、继承、正文尺寸、对象双栏。
- [MasterSpreads](https://developer.adobe.com/indesign/uxp/dom/api/m/master-spreads/) 与 [MasterSpread](https://developer.adobe.com/indesign/uxp/dom/api/m/master-spread/)：`add(2)`、`namePrefix`、`baseName`、移除本次新建文档附带的默认母版。UI Parent 对应脚本 master。
- [Page](https://developer.adobe.com/indesign/uxp/dom/api/p/page/)、[TextFrames](https://developer.adobe.com/indesign/uxp/dom/api/t/text-frames/)、[TextFrame](https://developer.adobe.com/indesign/uxp/dom/api/t/text-frame/)、[TextFramePreference](https://developer.adobe.com/indesign/uxp/dom/api/t/text-frame-preference/)：左右页、页边界、页码框与单栏设置。
- [SpecialCharacters](https://developer.adobe.com/indesign/uxp/dom/api/s/special-characters/) 与 [Justification](https://developer.adobe.com/indesign/uxp/dom/api/j/justification/)：自动页码标记、远离书脊对齐。

当前没有未核实 API 的待实现分支。代码中的 `TODO: DESIGN VALUE` 是规格尚未给定的设计参数，不是 API 猜测。实机验收状态单独记录于 `MODULE_STATUS.json`。
