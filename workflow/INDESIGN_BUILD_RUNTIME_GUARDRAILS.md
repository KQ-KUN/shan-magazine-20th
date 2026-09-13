# InDesign Build Runtime Guardrails

适用于所有新 build，尤其是调用 `parents.create()`、创建 Parent spread 或编辑 Parent spread 的 build。该规范约束 build 的结束状态与自动验收，不授权修改任何 FROZEN 模块。

## Document page 与 Parent spread

1. `parents.create()` 或 Parent spread 创建、编辑完成后，不得假定活动窗口仍位于 document page。
2. 必须严格区分 `document.pages` 与 `masterSpreads` / Parent spreads。Parent spread 只定义继承版式，绝不能作为正文是否生成成功的视觉验证对象。
3. renderer 完成后，build 必须显式调用 `focusDocumentPage()` 或等价逻辑，将活动视图切回本次生成内容的首个 document page；默认使用 `document.pages.item(0)`。
4. 即使 renderer 已成功返回，也必须执行上述聚焦步骤，确保用户最终看到实际内容页，而不是空白 Parent 网格。

等价的最小逻辑可以写在非冻结 build 中：

```jsx
function focusDocumentPage(document, page) {
    if (app.layoutWindows.length > 0) {
        app.activeWindow.activePage = page || document.pages.item(0);
    }
}
```

不要为统一该逻辑而修改既有 FROZEN build 或公共模块；新任务在其允许范围内采用即可。

## 数据验收，不以当前屏幕代替

自动验收必须读取实际 document/story/frame 数据，至少断言：

- `document.pages.length >= 1`；
- document page 上 `textFrames > 0`；
- 至少一个正文文本框与其 document page 相交，不能为零尺寸或完全位于页面外；
- 主 story 的可见字符数达到样本规定的最低值；未另行规定时，非短文本样本使用 `> 100`；
- 文档正文包含任务指定的关键首段/标题与末段文本；
- 主 story 所在图层可见；
- overset 状态被明确检查并写入 build 报告，不得靠页数或屏幕外观推断。

若存在多个 story，应对 document page 上的 story 去重后汇总字符与文本，不得只检查当前选中框。

## TASK 10A 根因与诊断顺序

TASK 10A 的空白现象来自 build 渲染完成后仍停留在双页 `I-FRONT` Parent spread，实际正文页没有被重新激活。两页空白 Parent 网格不等于 DOCX 导入失败、renderer 未调用或 story 未写入。

遇到类似现象时，先分别确认当前活动对象是 document page 还是 Parent spread，再检查 document page、story 和 text frame 数据。只有数据断言失败时，才沿 DOCX 导入、renderer、story 写入、文本框几何与图层继续诊断。
