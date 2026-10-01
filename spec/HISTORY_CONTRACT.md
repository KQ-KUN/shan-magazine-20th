# History / 地层输入与验收契约

源文件 `manuscripts/source/山东大学学生科幻协会会史 (2.5）.docx` 是唯一正文事实来源。副本在 Windows 设置只读；Git 不保存只读属性，运行时仍强制核验 SHA-256。

当前锁定 SHA-256：`1beb214adf0372b61bb4ca312c20317f0c77b38812f1b17131e37e6bb5b9756f`。

本轮发现桌面源文件已更新，先前预检哈希 `52d91cdbad03a440cabad9b738377a2c381e946d2496749e4e04e0b27460937c` 不再适用于当前文件。当前文件已删除2012—2013中单独的负责人段，主段落由217变为216；部分嵌入图片的字节和像素尺寸也已随源文件更新。实现未编辑或重新压缩 DOCX、XML、图片。

## 明确授权的例外

用户确认只读源 DOCX 不变，在导入结果执行两处指定例外。第一项删除已包含在当前源文件，不重复删除。第二项仅通过 sidecar 的段落索引换序：当前源 P148 移至 P150 之后，即 P149（一月正文）→P150（一月图片）→P148（四月正文）→P151（五月正文）。其他216个主段落一一保留，含空段、尾部空格、原始破折号、人名、名单、不可见方向字符。2025年4月第二届星海邀约条目保持不变。

## 文件与原文

- `content/HISTORY_IMPORT_MAP.json` 只存段落索引、输出索引顺序、年份索引、图片锚点、图注关系和样式名；不存正文。
- `assets/history/source-document.xml` 是从锁定 DOCX 取出的 `word/document.xml` 完整原始字节，不作清理、重写或序列化。它是受哈希约束的导入载体，不是第二份编辑稿。
- `assets/history/image*` 是对应 ZIP member 的完整原始字节，不增强、不重绘、不裁切文件；第一图在 InDesign 框内恢复源文件原有裁切。
- `spec/HISTORY_SOURCE_AUDIT.json` 存源哈希、XML哈希、原图哈希/像素/裁切、逐段哈希；不存正文。
- `tests/history_source.py` 独立读取 DOCX，并比对原始 XML 与每张图字节。测试正文与XML树只通过 stdin 传给 Node，不持久化正文快照。

## 导入方法

不依赖 Word 原生导入器对浮动文本框的兼容性。构建先核验 DOCX、原始XML、24张图片哈希，再用 ES3 字符串与数组读取同一原始OOXML，建立 InDesign story 与随文图形。源读取器不访问宿主 E4X 的 XML / XMLList / Namespace / QName；原来的静态 E4X 适配器不能代表 InDesign 中的 XML 对象行为，现已移除。

读取器保留嵌套标签与命名空间作用域，只选 Word body 的直接段落，避免浮动文本框内的段落混入正文。XML 自身的五种预定义实体及数值字符引用只解码一次；这是 XML 语法解码，不做 trim、Unicode normalization 或文本自动纠错。DTD、自定义实体、不闭合标签及未知结构会明确失败，不尝试补全。生产读取器在静态测试中直接读取原始 XML 字节对应的 UTF-8 字符串，与独立 Python DOCX 读取器逐段比较；不再用模拟的 XML 对象代替生产解析。

选择 AlternateContent 的 Choice，仅忽略其同一对象的 Fallback。主段落文字不包含浮动图注；图注从原XML文本框读取一次，放入与第一图组成的随文 Group。没有新增正文快照、正文 JSON 或新的事实来源。

输出为216个主段落及1个原有图注子story。没有章节导语；独立章标从现有 CONTENT_MANIFEST 读取 `贰｜地层 / STRATA`，不修改清单、不调用 Chapter renderer、不做整刊装配。

## 唯一允许的文本比较规则

逐段比较；一律不 trim，不合并空白，不改 Unicode，不替换破折号，不清理 U+200E，不合并空段。

1. Word `w:t` 原文读取；`w:tab` 映射为 U+0009，`w:br` 映射为 U+000A。本源没有硬换行。
2. InDesign 段尾 U+000D 只剥除一次，匹配 Word 段落边界；不剥除正文中的换行。
3. 只删除由本模块插入的 U+FFFC 锚定对象标记；每段数量必须等于该段图片数，错误数量立即失败。源文件没有原生 U+FFFC。
4. 仅 P148 的输出位置不同，正文字符不变。当前源不再有需删除的段落，故每个主段落必须出现恰好一次。

## 样式与排版

C-HISTORY、185×260mm、3mm出血、双栏6mm栏距。History token 仅作用于新文档中的独立样式，不修改任何冻结代码。连续编年，不强制一年一页；名单不拆分。空段保留，用较小行距形成间隔。年份通过 keepWithNext 和宿主栏位置比较避免孤立。图片段尽量整体保留，多图段不拆为新段。低像素图采用2模块框，图像内容宽度不超过原DOCX展示宽度，必要时在网格框内保留透明边距；通常3模块单栏，原始极宽拼合图为6模块。图注段保留原位置，并通过 keep 和实际页面对应验收。

## 静态检查

在仓库根目录 PowerShell 执行（使用本机既有 Python / Node 路径即可）：

```powershell
$env:PYTHONIOENCODING='utf-8'
python tests/history_source.py | node tests/history.test.cjs
git diff --check
```

`--prepare` 仅用于第一次生成字节相同的材料，拒绝覆盖不同字节。正常测试没有写入。Python 检查所有既有模块状态、全部 FROZEN scope、清单和锁定正封面与 HEAD 一致；Node 检查全部段落而不是关键词，并覆盖文字变更、删段、乱序、锚点错误、图注关系错误、栏底年份、无进展 overset 和页数上限。

## 用户实机验收

本轮不得启动 InDesign、COM、GUI。用户在 InDesign 2026 脚本面板运行 `build/13_history_test.jsx`。

成功才在新文档 label 与 `exports/history/HISTORY_RUNTIME_REPORT.txt` 写入 PASS 和实际页数。构建检查每段原文、24图实际story归属/顺序、5图注、21年份、实际document pages、字体、链接、拉伸、页面几何和overset；失败保留新文档并标记FAIL，最后聚焦实际正文第一页。不会自动保存/导出，不修改已有打开文档。

PDF视觉仍需人工逐页检查：双栏阅读、原稿图片与所属文字接续、历史图片可读性、栏底留白、图注间距与第一图集团位置。预估页数和审美参数仅作提示，不触发fatal assertion。实机完成且用户确认PDF之前，History保持 `IMPLEMENTED_PENDING_IND2026_TEST`、`runtimeTested:false`、`frozen:false`。

本轮新增API按Adobe官方[ParagraphStyle](https://developer.adobe.com/indesign/uxp/dom/api/p/paragraph-style/)、[AnchoredObjectSetting](https://developer.adobe.com/indesign/uxp/dom/api/a/anchored-object-setting/)和[Paragraph](https://developer.adobe.com/indesign/uxp/dom/api/p/paragraph/)成员核对；文档核对及Node语法检查不能代替ExtendScript原生编译与实机运行。
