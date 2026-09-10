# TASK 04 Visual System 验收

入口：`build/04_visual_system_test.jsx`，经现有 Scripts Panel Junction 运行。顺序为冻结 Foundation → 独立 Visual System → 复用内容方法。代码不修改冻结文件。

## 本轮参考范围与数值来源

先读 VISUAL_REFERENCE_INDEX.md；使用 REF_01、REF_02、REF_03、REF_08，因实现单条地层细线才额外读取 REF_04。未重新读取已读四图，未读取整张展板、封面或七章图标。用户本轮限制优先于原始 TASK 04 / VISUAL_SYSTEM 中旧的整图路径；这两份提供文件保持原样。

执行字号、行距、字距、段距、规则线宽、RGB、页眉页脚位置只来自 VISUAL_TOKENS.json。边距、模块宽度及 Chapter 四个结构容器复用冻结 Foundation/Chapter 的既有几何规则；页眉左右框按已有版心等分，未从图中量取数值。无 Character Style 的新数值 token，保持字符样式不变；Object Style 仅覆盖批准的 Interview 双栏和栏距。

## 测试内容

- 一个“火种”章节示例：display_index、CN、EN、intro 原文来自 CONTENT_MANIFEST；前言宽度限制为 tokens 的 4 模块；下边距边界仅一条 tokens 规定线宽/颜色的地层基线。没有生成七章、复杂曲线路径或满版宇宙背景。
- Interview 使用邵珠瑜原稿的开头元信息及前四组完整 Q/A。片段边界由原生 Word InterviewQuestion 样式决定，保留该边界之前所有原文；测试文档明确标注是片段，不修改 DOCX。问题数只是测试样本选择，不是视觉参数或最终页数。
- 片段自动续页，目标为 2—4 页压力测试；不通过修改字号或固定页数强行达标。插入章节示例后按新左右页重新对齐页内文本框并检查 overset。
- A—E 有左右静态页眉、细线和外侧页码；F/G 仅页码；H/I 无 Running Header/Footer。原 Foundation 自动页码仅在新文档中替换为视觉层对象，源文件不变。暖纸色放在 Parent 背景最底层。
- 全部普通文本使用 tokens 色板；SDU 红为 provisional RGB，未写入 CMYK。Special Blue 仍仅保留特殊用途，不用于 Running System。
- 没有头像、肖像占位、图片或引语占位。

## 字体检测与未完成项

按 tokens 的有序 font_stacks 检查 InDesign 已安装字体。优先指定字重；指定字重缺失时只使用批准家族的 Regular 并告警。整个批准字体栈缺失则保持宿主原字体并明确告警，该状态不视为字体视觉验收通过。绝不把相近字体名静默当成批准字体。

Windows 注册表只读检测发现 Consolas、Noto Sans SC、Noto Serif SC；后两者名称不在本次批准栈中，不能替代 Noto Sans CJK SC / Noto Serif CJK SC。InDesign 字体实际可用性应以运行后文档标签 SHAN_VISUAL_FONTS 为准。

TODO: DESIGN VALUE — 最终印刷 CMYK 未批准；复杂等高线/地层带的路径坐标未定义，因此只实现最小细线。需人工检查实际字形、字重、疏密、页眉和页码。

## 验证命令与结果边界

`node tests/foundation.test.js`、`node tests/chapter.test.js`、`node tests/interview.test.js`、`node tests/visual_system.test.js`。

原生检查：`powershell -NoProfile -File tests/visual_system.native.ps1`。加载同一 createTestDocument 路径，检查 H/I 隐藏、Interview Parent、2—4 页片段、所有页内框与 Parent 框无 overset，输出实际字体报告。只关闭它自己新建的测试文档，恢复脚本计量单位。

本轮 Node 测试通过；首次 InDesign COM 启动返回 0x80080005（服务器运行失败），原生字体/编译/排版验证未完成，不把 Node 结果冒充宿主结果。Visual System 保持 IMPLEMENTED_PENDING_IND2026_TEST、runtimeTested=false、frozen=false，待原生测试与用户视觉验收。

API 参考：[ParagraphStyle](https://developer.adobe.com/indesign/uxp/dom/api/p/paragraph-style/) 的字距/段距/规则线/单侧段落边框，[Font](https://developer.adobe.com/indesign/uxp/dom/api/f/font/) 的字体家族与字重。文件导入、按 Word 样式映射、续页复用已验证的 Interview；JSON 解析复用冻结 Chapter 的无 eval parser。
