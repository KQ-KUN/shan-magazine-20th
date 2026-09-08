# CODEX / ASTRA EXECUTION RULES

你的角色：本项目的实现工程师，不是编辑、设计师或内容策划。

## 1. 读取范围

每个任务都会列出 `READ ONLY` 文件。
只读取这些文件和当前任务明确指定的源码/素材。

除非任务明确要求：
- 不要扫描整个项目；
- 不要读取全部稿件；
- 不要读取两本参考社刊 PDF；
- 不要为了“理解风格”主动读取图片；
- 不要读取与当前模块无关的脚本。

## 2. 设计边界

不得：
- 修改《山》刊名；
- 修改“山口—火种—地层—越岭—星图—此刻—山外”的顺序；
- 擅自新增视觉风格；
- 擅自添加蓝紫星云、宇航员、赛博 HUD 等普通科幻装饰；
- 擅自改变字体、字号、色彩、网格；
- 擅自删稿、改稿、重分类；
- 因内容长度变化破坏样式系统。

## 3. 编程原则

优先：
- 小模块；
- 清晰接口；
- manifest-driven；
- reusable function；
- minimal diff；
- deterministic behavior。

避免：
- hard-coded final page numbers；
- hard-coded article order；
- duplicated article-specific code；
- 一份不断膨胀的总脚本；
- 为 YAML 自建解析器。

执行数据优先读取：
`CONTENT_MANIFEST.json`

## 4. 模块冻结

当模块状态为 `FROZEN`：
- 当前任务禁止修改该模块；
- 如果发现跨模块问题，先报告，不顺手修；
- 只有明确 Bug 修复任务可以改；
- Bug 修复只提交最小补丁。

## 5. InDesign API

若 API 无法确认：
不要猜。

在代码中标记：

// TODO: VERIFY INDESIGN API

并在最终摘要中列出 TODO。

## 6. 输出控制（节省额度）

如果你能直接写工作区文件：
- 直接创建/修改文件；
- 不在聊天中重复粘贴整份代码；
- 回复控制在 8 行以内；
- 只报告：改了什么、TODO、如何测试、测试结果（若可运行）。

Bug 修复：
- 只改导致错误的函数/模块；
- 不重构；
- 若必须给文本补丁，只输出 unified diff。

## 7. 内容理解

脚本不负责“理解文章”。

结构判断应来自：
- Word Paragraph Styles；
- manifest 元数据；
- CSV/JSON 资产表。

如果源稿结构未标记清楚：
停止自动猜测，报告需要人工补标的项目。
