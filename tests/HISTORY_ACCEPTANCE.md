# History native loading evidence

2026-10-02，InDesign 2026 `21.5.1.73` 实机生成结果：8个实际 document pages；216段逐段原文/顺序相等；21条编年；24张原图；5处原有图注关系；字体与链接正常；无 overset。实际第一页 History body 有45行，运行报告确认 `activePageAfter=1`、`activePageIsParent=false`。

修复针对宿主行为：集合没有 `isValid` 时按长度取项，成员继续校验；仅生成的图片锚定字符使用 `Leading.AUTO`，给 inline 图片及同段多图预留高度。没有改原文字符、段落、图片文件/尺寸、token 或冻结模块。源 DOCX SHA-256 保持 `1beb214adf0372b61bb4ca312c20317f0c77b38812f1b17131e37e6bb5b9756f`。

真实 build 入口：`build/13_history_test.jsx`。自动验证命令：`powershell -NoProfile -File tests/history.native.ps1 -Export`；使用 `app.doScript(File(...))` 执行同一入口，不替换正文导入器或 renderer。自动测试设置 `NEVER_INTERACT` 时 build 记录通知而不弹 modal；手动运行仍显示 PASS/错误弹窗。测试恢复交互及 PDF 导出偏好，保留生成文档，不关闭已有文档。

验证导出的 `exports/history/HISTORY_NATIVE_PROOF.pdf` 共8页，185×260mm，所有页均有文本；Poppler 渲染8页确认正文可见及同段多图没有重叠。`HISTORY_NATIVE_PROOF.indd`、`HISTORY_RUNTIME_REPORT.txt` 同目录保存。页数低于原预估，仅是提示。此证据证明正文加载和自动数据检查通过，正式PDF视觉验收仍待用户确认；不冻结 History。

原稿P89含5个 U+200E 方向字符，逐段核验保留了这些字符。PDF第3页该处呈现方框，未擅自清理或替换；这是用户视觉验收时需单独确认的源字符显示问题。
