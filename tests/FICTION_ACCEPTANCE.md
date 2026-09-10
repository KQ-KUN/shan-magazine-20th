# TASK 05 Fiction 验收

唯一真实样本为 `manuscripts/04_fiction_四叠半_笠原JunE.docx`。包内文件原样加入；用户最新要求覆盖旧规格中有关特殊蓝的描述，不启用作品专属皮肤。

## 实现接口

`SHAN.fiction.create(doc, source, articleId)` 接收已建立 Foundation 和共用视觉样式的新文档，返回 story、pages、counts、overset。只依 Word Paragraph Styles 映射；未知样式、缺失目标样式报错；映射及续页前后核对全文不变。稳定标签为 `SHAN_FICTION:<articleId>:story` 和 `SHAN_FICTION:<articleId>:frame:<index>`。

顺序：Foundation → 冻结 typography/running → fictionSkin.apply → fiction.create。Fiction skin 仅按 FICTION_TOKENS 设置共用章节样式、opener/章节跨栏及双栏正文；不修改冻结源文件。复用已验证的 DOCX 导入、样式映射、文本框串联及无进展 overset 保护模式。生产脚本不解析 DOCX XML、不按语义识别章节、不硬编码正文或最终页数。

## 自动验证

- `python tests/fiction_source.py | node tests/fiction.test.js`
- `node tests/foundation.test.js`
- `node tests/chapter.test.js`
- `node tests/interview.test.js`
- `node tests/visual_system.test.js`
- `powershell -NoProfile -File tests/fiction.native.ps1`

Python 仅为测试读取指定 Word 的段落样式与文字，输出内存中的比对数据，不写第二份稿件，也不参与 InDesign 导入。原生测试逐段比较 Word 与 InDesign 文字，仅去掉 InDesign 段落终止 CR；核对全部样式、作者、六章节、D-FICTION、2 栏/6 mm、跨栏、串联、自动续页和 overset。仅关闭测试自己建立的文档，恢复计量单位。Node 测试另覆盖未知/缺失样式报错、导入偏好恢复、无进展保护、BOM 和四个冻结模块相对 tag 无变化。

## 2026-09-11 结果

五套 Node 测试通过。InDesign 21.5.1.73 原生编译及运行通过：8 页、162 段（154 Body、6 FictionChapter、1 ArticleTitle、1 Author），全文逐段一致；作者为笠原JunE，标题/作者/章节跨两栏，所有页 D-FICTION，正文双栏，全文无 overset。8 页是当前实际排版结果，不是固定页数目标。

字体全部匹配：正文思源宋体 Regular；作品标题及小说章节思源宋体 SemiBold；作者思源黑体 Medium；Metadata 思源黑体 Regular；页码 Consolas Regular。没有 MISSING APPROVED FONT。

无新增 API TODO；最终印刷等已有设计待定项保留。Fiction 状态按 TASK 05 保持 IMPLEMENTED_PENDING_IND2026_TEST、runtimeTested=false、designValuesPending=true、frozen=false，记录的原生自动验证不替代用户视觉验收；本轮不冻结、不打 tag。

## 人工入口

在现有 Scripts Panel Junction 中运行 `build/05_fiction_test.jsx`。检查实际字形、章节视觉和跨页阅读；脚本不自动保存或导出。不得加载其他稿件或生成专属 skin。
