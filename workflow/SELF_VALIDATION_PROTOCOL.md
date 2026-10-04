# Assembly V0 — Codex 自验证协议

用户不再承担“运行一次 -> 截图报错 -> 再修一次”的调试角色。

本任务完成条件不是“代码写完 / 静态测试通过”，而是：
**Codex 自己完成静态 + native/host runtime + 输出结构验证；只有通过后才 commit/push。**

## A. 自动化入口

新增：
`tools/run_assembly_v0.ps1`

职责：
1. 检测 Windows 本机 Adobe InDesign COM automation 是否可用；
2. 连接/启动 InDesign 2026；
3. 通过宿主执行 `build/14_magazine_assembly_v0.jsx`；
4. 等待 build 完成；
5. 收集 runtime report / error report / 生成文件；
6. 返回非零 exit code 表示失败。

不得：
- kill 用户现有 InDesign 进程；
- 关闭用户无关文档；
- 依赖人工点击 alert；
- 把 GUI 截图当 runtime success。

COM API / `doScript` 的实际签名必须从本机可验证接口或已有项目实践确认；不允许凭记忆硬猜枚举值。

## B. Automated mode

`build/14_magazine_assembly_v0.jsx` 必须支持 automated mode：
- 自动模式下不弹阻塞性 `alert()`；
- 错误写入：
  `exports/assembly_v0/SHAN_ASSEMBLY_V0_RUNTIME_ERROR.txt`
- 成功写入明确 success marker/report；
- 无论成功或失败，保留原始 stage + component id + file/line/message/stack；
- cleanup 不能覆盖原始错误。

如果采用 `app.scriptArgs` / DoScript arguments 传入自动模式，必须先在 InDesign 2026 实机验证该方式。

## C. 自修复循环

Codex 必须按以下顺序自己运行：

1. Static tests
2. Native JSX include/compile check（如宿主支持）
3. `tools/run_assembly_v0.ps1`
4. 若失败：
   - 读取 runtime error report；
   - 定位 stage/component；
   - 只修改 TASK 14 allowlist；
   - 重跑 static + host runtime；
5. 直到 runtime 全部 PASS。

最多允许 6 次有实质代码修改的 host-runtime 迭代。
如果仍失败：
- 不 commit 一个“待用户帮忙调试”的版本；
- 保留日志；
- 最终明确报告 `HOST_RUNTIME_BLOCKED` 及唯一根因。

允许停止而不是瞎修的 blocker：
- InDesign COM 在当前 Codex 主机完全不可访问；
- 安装/字体/权限等外部依赖缺失且无法在授权范围内修复；
- 需要修改 FROZEN 文件才能继续。

## D. Host runtime PASS 条件

必须由实际 InDesign 2026 执行证明：

- `build/14_magazine_assembly_v0.jsx` 正常结束；
- 所有 manifest completed components 均成功 render/export/place；
- 没有 `FAILED` component；
- completed content `overset=false`；
- 所有 placed component PDF link 有效；
- document pages 与 report 一致；
- chapter recto 规则通过；
- 只有 manifest 允许的 intentional blank；
- no unexpected blank page；
- 正封面 link 到 approved external artwork；
- 无 back cover / spine；
- 最后 active view 位于实际 review document page；
- `SHAN_INTERIOR_ASSEMBLY_V0.indd/.pdf` 存在；
- `SHAN_REVIEW_V0.indd/.pdf` 存在；
- runtime report JSON/TXT 存在。

## E. PDF / output 自验证

Host runtime 成功后继续自动检查，不要马上 commit。

### Approved front cover
使用 `indesign-publication-production/scripts/inspect_pdf_artwork.py` 或等价验证：
- 1 page
- Trim 185×260mm
- bleed 3mm
- rotation 0
- hash 记录

### Interior PDF
用 pypdf / PyMuPDF / pdfinfo 等只读工具检查：
- page count == report `interior_pages`
- 每页成品尺寸一致
- 文件非加密、可正常解析
- 不存在 0-page / damaged PDF

### Review PDF
检查：
- page count == `1 + interior_pages`
- page 1 = cover wrapper
- 后续页数量 == interior
- report component page ranges连续且不重叠
- manifest completed/pending 全部出现且只出现一次
- no unexplained trailing blank

### Render smoke
将 `SHAN_REVIEW_V0.pdf` 全页低分辨率渲染为 PNG thumbnails/contact sheet（只用于验证，不提交 Git）。
至少程序检查：
- 每页可渲染；
- 页面不是纯空白（intentional blank 除外）；
- 无页渲染失败；
- 重要页面（封面、首内页、每章 divider、最后一页）有非空像素/对象。

若 Codex 当前具备图像视觉检查能力，再做一轮 contact-sheet 视觉审查：
- 页面顺序；
- 明显裁切；
- 丢图；
- 巨大异常空白；
- component PDF 没有缩放变形。
若当前 Codex 环境不具备视觉能力，标记 `visual_agent_check=UNAVAILABLE`，但不要把它伪称为视觉验收。

## F. Git gate

只有以下全部通过后才允许 commit/push：

- static PASS
- native compile PASS（若可用）
- host runtime PASS
- PDF structural PASS
- frozen-scope PASS
- `git diff --check` PASS
- staged diff only allowlist

用户之后仍会看整刊 PDF 做审美判断，但不应该再承担基础 runtime debugger 的角色。
