# 《山》Base Visual System v0.1
状态：已批准用于视觉原型。结构模块 Foundation / Chapter / Interview 保持 FROZEN。
## 1. 视觉方向
以 `references/VISUAL_BOARD_APPROVED.png` 为气质参考，但机器实现以 `spec/VISUAL_TOKENS.json` 为唯一数值真源。
关键词：文学纪念刊、纸本感、档案感、瑞士式秩序、克制、山体/等高线、少量红色强调。
禁止：蓝紫星云、宇航员、赛博 HUD、大面积科技发光、满版宇宙背景。
## 2. 配色
暖纸色 `#F7F4EC`；炭黑 `#1F1F1F`；主强调红 `#8B2D2D`（仅视觉原型，最终印刷 CMYK 后续替换）；线条灰米 `#CFC9BE`；档案褐 `#B7AA94`。
`#81C7D4` 仍只用于《四叠半》等特殊页，不进入全刊常规 Running System。
## 3. 字体
优先使用开源字体栈：
- 中文文学正文/主标题：思源宋体 / Source Han Serif SC
- 信息、问题、英文标签：思源黑体 / Source Han Sans SC
- 页码/年代/档案编号：Source Code Pro
如首选不存在，只能从 `VISUAL_TOKENS.json` 的批准 fallback 中选择；全部缺失时警告，不自行挑其他字体。
## 4. 正文密度
采访当前“文字墙”只作为结构测试，不作为视觉目标。
常规中文正文：9.3 pt / 15.5 pt。
Interview Answer：9.3 / 15.8，段后 2.2 mm。
Interview Question：10.2 / 16.5，中黑/中等字重，问题前留白明显，并使用极细红色 paragraph rule above。
不硬编码文章最终页数，但长篇创始人采访视觉上应自然扩展到约 5—6 页，而不是强塞进 3 页。
## 5. 文章标题层级
ArticleTitle：约25/29 pt，宋体类 SemiBold。
ArticleSubtitle：10.5/15，黑体类，Muted。
Author：9.2/13。
Metadata：7.5/11，Mono，字距略松。
## 6. Chapter
现有 `壹—陆` 不改。
编号为暗红，大号；中文章节名为大号宋体；英文名为小号黑体、较大 tracking；章节前言保持大留白。
只允许一组低干扰等高线/地层细线作为装饰，不填满背景。
H-CHAPTER 不使用 Running Header / Footer。
## 7. Running Header / Footer
普通正文页建立极轻的 Running System：
- 顶部：左侧 `山  SHAN`，右侧 `2006—2026`
- 顶部下方一条 0.25 pt 细线
- 底部外侧页码
- 不使用粗线、色块或装饰性边框
- H-CHAPTER / I-FRONT 隐藏
- F-GALLERY / G-MESSAGE 仅保留最小页码信息
动态文章名/章节名后续 Assembly 阶段再接入，不在本轮硬编码。
## 8. Interview
本轮不做人像主视觉。默认 `default_portrait=false`。
采访首屏后续可以使用：标题、身份、年份、引用、档案物/老照片、等高线；没有合适照片时宁可留白，不放通用人物头像占位。
本轮只改善字体和密度，不拆改 Interview 的内容结构，不新增肖像框。
## 9. 实现边界
Foundation / Chapter / Interview 的代码文件不修改。
视觉层新增 `visual/` 目录，在运行时覆盖“designValuesPending”的样式属性与 Parent 装饰。
未来所有 build 顺序应为：
Foundation → Visual System → Content Module
而不是修改 frozen core。
