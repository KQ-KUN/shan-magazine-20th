# 《山》Foundation

《山》——山东大学学生科幻协会二十周年纪念刊（2006—2026）。

本轮仅实现基础文档、命名样式和 Parent Pages。规格来源仅为 `spec/PROJECT_BRIEF.md`、`spec/MAGAZINE_SPEC.md` 和 `spec/CODEX_RULES.md`，均原样复制。没有读取或复制交接包中的其他规格、正文和素材。

## 第一次测试

1. 在 InDesign 2026 的“窗口 → 实用工具 → 脚本”中定位用户脚本文件夹。
2. 将整个仓库文件夹复制或建立快捷方式到该文件夹，保持 `core/` 与 `build/` 相对位置不变。
3. 运行 `build/01_foundation.jsx`，只运行这个入口，不单独运行 `core/`。
4. 按 `tests/INDESIGN_ACCEPTANCE.md` 检查结果；需要保留时手动另存到 `exports/`。

每次运行创建一个新的未保存文档；不会修改活动文档，也不自动导出。唯一初始页面是 InDesign 的测试空壳，不代表最终页数。9 个双页 Parent Spreads 不计入成品页数。

## 待确认的设计参数

- 六个逻辑色板只有名称，没有批准色值。InDesign 色板无法没有内部数值，脚本不赋值，保留宿主默认值并用 `UNRESOLVED_COLOR` 标签标记，绝不应用它们。只有 `C_SPECIAL_BLUE` 使用规格的 RGB 129/199/212；没有转换或决定任何最终 CMYK。
- 字体仅给了宋体类、黑体类和 Mono 类，未指定具体家族与字重。脚本警告并保留样式名称，不选替代字体。宿主继承字体不是项目批准字体。
- 正文使用允许范围内的 9.5 pt / 15 pt；其余未定义字号、字重、字距、色彩、对象效果保持未决。对象样式 `O_Text_Main` 设置双栏、6 mm 栏距与 `P_Body_CN`。
- 页码容器使用外侧一个模块列和下边距区域；`P_Page_Folio` 远离书脊对齐。精确基线仍待确认。H-CHAPTER 隐藏页码，A–G 与 I 使用自动页码；未绘制额外线条或装饰。

## 验证边界

`node tests/foundation.test.js` 验证范围约束、初始化行为、坐标计算和错误恢复。测试替身不等于 InDesign 引擎；本轮脚本尚未在 InDesign 2026 中实际运行，第一次实机测试按上文操作。API 核对来源见 `workflow/API_VERIFICATION.md`。
