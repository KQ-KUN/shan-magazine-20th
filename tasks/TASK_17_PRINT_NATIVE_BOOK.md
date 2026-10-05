# TASK 17 — Print-native book structure and chapter art

用户授权：独立封面、全白封二、连续内页物理页序、仅替换原有 parity blank、七章艺术页及相关 Assembly 验证。保留已通过正文、图文系统、源 DOCX、正封面及所有 FROZEN 文件。

## 输入与范围

- 批准基线：`c55d7f793fcc82f0e3a15f758e671a31b51ff944`。
- 已完整阅读当前 TASK16 Review（72页）、参考《临界点》30周年纪念刊（88页）、当前 manifest、Chapter/Assembly 实现、印刷与宿主规则。参考只用于章节色彩、比例和节奏判断，没有导入参考刊资产。
- `PRINT_BOOK_BASELINE.json` 固定原26个组件的顺序、SHA-256、页数和起止页；19个非章节 PDF 为批准正文输入。完整输入仍在本地 `exports/assembly_v0/components/`，不把忽略的输出文件加入 Git。
- 全部14个本轮文件为新增文件。现有 Chapter/Assembly、正文 renderer/skin/token/map、CONTENT_MANIFEST、源稿和封面保持基线字节不变。
- 两个既存 Memoir probes 原样保留，不进入提交。

## 物理页模型

| 文件/页面 | 模型 |
| --- | --- |
| Cover artwork | 原封面独立单页；不占 interior folio |
| Reader 1 | Front Cover，RIGHT |
| Reader 2 | 空白 C2，LEFT，无 Parent/对象/印刷内容 |
| Reader 3 | Interior 1，RIGHT |
| Interior | 连续1—71；奇数RIGHT，偶数LEFT |
| Reader | 共73页，默认 `TwoPageRight`，CropBox 为成品 TrimBox |

七章起始内页：山口1、火种7、地层15、越岭23、星图27、此刻63、山外69，全部RIGHT。

仅原内页6、26、62的 parity blank 改为火种、星图、此刻的 transition verso。山口、地层、越岭、山外前没有新增过渡页。三章样板中的地层双页仅为独立设计样板，未向整刊插页。原 Pending 内容继续保留。

`binding_mode=UNCONFIRMED`；`cover_pages=4` 是封一至封四的正式概念，已提供 artwork=1页，Reader 模拟使用封一+空白封二=2页。没有生成封三、封四、书脊或为4/8/16倍数补页。最终内页末页为RIGHT，装订/拼版需印厂确认。

## 章节系统

统一标题/大序号/英文/原 intro 层级，章节文字逐框精确核验。原生矢量绘制，无 AI 图像或参考刊资产：

| 章 | 主色 CMYK | 母题 |
| --- | --- | --- |
| 山口 | 3/4/10/0 | 象牙色、酒红、等高线入口 |
| 火种 | 12/70/65/22 | 砖红、火点与放射粒子 |
| 地层 | 23/49/60/29 | 赭色、沉积带和岩层线 |
| 越岭 | 68/33/51/38 | 灰青绿、山脊和跨越路线 |
| 星图 | 80/64/25/30 | 钴蓝、轨道与星点 |
| 此刻 | 70/32/35/27 | 石青、坐标交汇和信号 |
| 山外 | 64/64/28/32 | 暮紫、远山地平线和外向轨道 |

所有新增艺术 swatch 为 CMYK Process，代码核验总墨量≤220%，无猜测的 rich-black 配方。实际 PDF 再检查主色通道、满版出血、字体嵌入；文字距裁切线至少5mm，装订侧至少18mm，重要信息不跨中缝。

## 生产处理与已定位问题

1. Facing Pages 单页导出会把相邻页的 inside bleed 印入 C2。独立导出副本关闭 facingPages，验证每 spread 只有一页、顺序/对象数不变；原 INDD 保留书刊左右页。失败副本保留，成功仅关闭本轮副本。Reader INDD 在单页导出后将图片框的 inside edge 裁止于中缝，生成正确 native spread proof，不添加白色遮盖物。
2. 宿主沿用旧 sRGB/150ppi 导出设置。新导出器显式保留原颜色空间，不降采样、使用 ZIP 无损压缩；不猜印厂 ICC。新章节实际保留 CMYK，原受保护照片/封面不做颜色转换。
3. InDesign 对 placed PDF 字体重新编码会产生坐标舍入，并把采访 PDF 的 NBSP 转成 SP。最终 PDF 直接保留批准正文生产副本的页面流和资源，章节/过渡页来自真实 InDesign；不放宽 Unicode 或正文位置核验。
4. 生产副本只把准确匹配的原 `C_TEXT` 向量 RGB `.122/.122/.122` 转为 CMYK `0/0/0/1`。逐页文字、盒尺寸和解码图片流 SHA 不变；源组件 PDF 不变。
5. PDF finishing 后更新本轮两份 INDD 的链接，重验71/73页、全部链接NORMAL、无 overset、C2空、图片100%等比、inside bleed 不侵入邻页，保存并 focus 实际第一页。无关文档不关闭。
6. Review 的 CropBox 模拟成品尺寸。封二全 MediaBox 墨迹测试使用内存副本开放 MediaBox，避免 pdfplumber 对隐藏 bleed 区域的黑色画布填充；不改变任何内容流/资源，也不以遮盖物制造白页。

## 完整入口和验收

先运行 `tools/run_print_book.ps1 -Mode Samples`：真实 InDesign 生成火种/地层/星图样板，先检查三张 sample spread/PDF/contact，再扩展七章。

整刊完整入口：`tools/run_print_book.ps1 -Mode Book`。包含生产副本校验 → `build/18_print_book_test.jsx` → PDF 页面流保留 → `build/19_print_postflight.jsx`。可用 `-PythonExecutable` 指定含 pypdf 的 Python；默认复用现有 bundled runtime。单独运行18只是宿主阶段，不包含最终 PDF finishing。

静态与结构验收：

```powershell
node tests/print_book.test.cjs
node tests/task16.test.cjs
python tests/history_source.py | node tests/history.test.cjs
python tests/print_book_outputs.py
git diff --check
```

本轮实际自验证：InDesign 2026 `21.5.1.73`；三样板和整刊 native PASS；71内页、73 Reader、37 native reader spreads；C2零印刷对象且全部白像素；7章recto；仅3处原有过渡页；无新增意外空页、无 overset/失效链接。逐个核验61,156个正文字符及位置/字号，59,447个原炭黑字符为100K，字体嵌入、原图片数量、3mm出血均通过。

视觉已检查三样板、Cover/C2/第一页模拟、七个章节实际前后跨页，以及73页全部缩略图。新增章节的层级/节奏/配色符合方向，重要信息未跨中缝；保留既有正文的自然尾部留白和 Pending 页，不以此次艺术修订重排正文。

输出目录 `exports/print_v2/`：

- `SHAN_INTERIOR_PRINT_V2.indd/.pdf`
- `SHAN_REVIEW_V2.indd/.pdf`
- `SHAN_REVIEW_SPREADS_V2.pdf`
- `SHAN_PRINT_SPREAD_CONTACT_SHEET.png`
- `SHAN_COVER_C2_INTERIOR_SIMULATION.png`
- `FINAL_PRINT_REPORT.json/.txt`、`PDF_PREFLIGHT.json`
- `SAMPLE_RUNTIME.json`、`Book_HOST_RESULT.txt`、`POSTFLIGHT_HOST_RESULT.txt`

正式送印仍为 `PENDING_PRINTER_COLOR_PROFILE_BINDING_AND_CONTENT`：Pending 内容、封三/封四、实际装订、印厂 ICC 和纸张颜色需最终确认。此次没有冻结新的 ChapterArt/PrintBook，也没有将结构 preflight 等同于印厂 PDF/X 或纸张打样认证。
