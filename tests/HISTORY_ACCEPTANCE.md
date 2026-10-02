# History Visual Refinement v2（本轮仅静态验证）

重新运行 `build/13_history_test.jsx` 后导出新 PDF。本轮未启动 InDesign，下面 v1 的8页实机证据不能作为 v2 验收结果；History 保持未冻结。

`content/HISTORY_DISPLAY_MAP.json` 只记录源段落索引、UTF-16换行位置及图片/年份/视觉行映射，不存改写正文。P12、P13、P24、P26 在第二组完整职务前插入 LF，原空格保留；P74 经用户确认保留为共享姓名的兼职条目。名单用 `P_History_Roster`（思源黑体信息层级），最后一条用 `P_History_Roster_Last` 段后5mm。14个名单/活动交界已标注；原有空段全部保留，仅交界处的空段使用0.1pt行高，避免额外叠加整行空白。只有名单的年份不增加此间距。

P6 完整正文后插入 LF，再锚定第一张档案图及原浮动图注的 Group；P90、P115、P189、P210 的双图通过 LF 分成两个完整视觉行，保留同一个 source paragraph。全部图片仍按原顺序、原所属年份续排。无新增 CR/内容段落。复原时仅移除原有规范允许的 FFFC 锚标记和单个段尾 CR，再按 sidecar 精确位置移除已记录 LF；不全局删除换行，不 trim，不转换破折号或清理源 Unicode。216段逐段完全相等检查保留。

图片显示宽度在 `spec/HISTORY_TOKENS.json`：照片通常68–73mm，海报52–58mm，低清徽章40mm；拼合图3为152mm，重要合影15、23为130mm。保留原比例及DOCX原裁切，按原像素限制放大至优选145ppi；该ppi、显示尺寸和页数均不作为 fatal assertion。跨栏图3与原图注39使用带 keepWithNext 的专用样式；无图注的跨栏图不与下一年份绑定。无共用图注的双图段允许在两张完整图片之间续栏/续页（keepFirst/LastLines=1），避免整组挤压版面；P189双图有共用原图注，保持整组不拆。

静态测试检查全部216段可逆复原、所有216段未经授权换行/改字的失败路径、21条编年、24张原图、5处图注、名单映射和间距样式、每张图片的段落边界及年份/顺序、比例和低清尺寸限制，并保留原有错误诊断/DOM失效/字体链接/overset/Parent聚焦回归测试。

实机及PDF待验收：

- 记录真实 document pages，确认无 overset、无丢图、无失效链接和缺字字体；结束聚焦 actual document page。
- 第一张档案图位于完整正文之后，“历史文化学院。”不落在图片下面；所有图片均为独立块。
- 名单逐职务换行，姓名列表保留；P74维持用户确认的兼职显示；名单与活动约一行距离。
- 24图顺序/年份和5处图注关系正确，无图片拉伸、图文重叠或图注离页。
- 特别检查双图段P90、P115、P189、P210及跨栏图15、23；若空间不足，应完整块续到下一栏/页。
- 重点检查2025—2026段图片密度、海报展示尺寸及末页留白。允许自然增页，无固定8页目标；这些审美项必须看新PDF。

# History v1 native loading evidence（此前版本）

2026-10-02，InDesign 2026 `21.5.1.73` 实机生成结果：8个实际 document pages；216段逐段原文/顺序相等；21条编年；24张原图；5处原有图注关系；字体与链接正常；无 overset。实际第一页 History body 有45行，运行报告确认 `activePageAfter=1`、`activePageIsParent=false`。

修复针对宿主行为：集合没有 `isValid` 时按长度取项，成员继续校验；仅生成的图片锚定字符使用 `Leading.AUTO`，给 inline 图片及同段多图预留高度。没有改原文字符、段落、图片文件/尺寸、token 或冻结模块。源 DOCX SHA-256 保持 `1beb214adf0372b61bb4ca312c20317f0c77b38812f1b17131e37e6bb5b9756f`。

真实 build 入口：`build/13_history_test.jsx`。自动验证命令：`powershell -NoProfile -File tests/history.native.ps1 -Export`；使用 `app.doScript(File(...))` 执行同一入口，不替换正文导入器或 renderer。自动测试设置 `NEVER_INTERACT` 时 build 记录通知而不弹 modal；手动运行仍显示 PASS/错误弹窗。测试恢复交互及 PDF 导出偏好，保留生成文档，不关闭已有文档。

验证导出的 `exports/history/HISTORY_NATIVE_PROOF.pdf` 共8页，185×260mm，所有页均有文本；Poppler 渲染8页确认正文可见及同段多图没有重叠。`HISTORY_NATIVE_PROOF.indd`、`HISTORY_RUNTIME_REPORT.txt` 同目录保存。页数低于原预估，仅是提示。此证据证明正文加载和自动数据检查通过，正式PDF视觉验收仍待用户确认；不冻结 History。

原稿P89含5个 U+200E 方向字符，逐段核验保留了这些字符。PDF第3页该处呈现方框，未擅自清理或替换；这是用户视觉验收时需单独确认的源字符显示问题。
