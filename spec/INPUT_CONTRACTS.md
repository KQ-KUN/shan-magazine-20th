# INPUT CONTRACTS v0.1
本轮只定义 Chapter 模块接口。后续任务再追加 Interview / Fiction / History 等接口，不提前加载。
## Chapter input
数据来源：`spec/CONTENT_MANIFEST.json` → `sections[]`
每个 section 必须包含：
```json
{"id":"origin","chapter_index":1,"cn":"火种","en":"ORIGIN","intro":"..."}
```
字段：`id` 为稳定机器标识；`chapter_index` 山口为 null、火种至山外为 1—6；`cn` 中文章节名；`en` 英文章节名；`intro` 章节前言，原文使用，不改写。
Chapter 模块不得从章节名推断编号、改写 intro、自行增加副标题、从正文稿件寻找章节信息、生成文章页面。
输出要求：每个 section 生成一个结构性章节扉页；使用 H-CHAPTER Parent；使用现有 `P_Chapter_Number`、`P_Section_Title_CN`、`P_Section_Title_EN`、`P_Chapter_Intro`；本阶段只验证结构、数据读取、顺序和样式绑定，不视为最终视觉定稿。
