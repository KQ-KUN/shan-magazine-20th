# TASK 18 — 章节小字与月曜杯幕后稿接入

用户提供六章小字，按字面替换；其中火种、越岭、山外三处发生差异，其余三章已有相同文字，山口保持不变。新增独立 Feature `feature_monday_cup_backstage`，紧接 `feature_beyond_ridge`，在星图扉页之前，不合并稿件、不新增扉页。

## 内容契约

用户确认的定稿路径为桌面 `社刊资料/我与科幻/第一届“月曜杯”山东高校科幻联合征文幕后二三事.docx`，虽然文件名没有 `(2)`，已明确批准使用它。正式副本 `manuscripts/12_feature_第一届月曜杯幕后_鲲图.docx` 原字节不变，SHA-256：

`37bae5b2b21eb1b8ffe789db47fef3525d17755d9b0a519458aba0ad2098e57c`

18段、2581字符、无图片。独立 layout DOCX 只映射 Paragraph Styles；保留源 XML 的 namespace 声明，不重新序列化全文。sidecar 只记录段落样式索引、①—⑧编号和哈希，不作为改写后的新事实来源。源作者段 `文/鲲图` 字面保留。

新 module 调用已有 FROZEN Feature renderer/skin，不修改其文件。编号只突出首字符，不把长段整段变为标题。沿用双栏、9.4pt/15pt 正文，通过 keep 避免标题孤立，页数自然生成。

## 已验证宿主与 PDF

- InDesign 2026 `21.5.1.73` standalone PASS：26—27内页、2页；18段逐段一致，所有行属于实际 document pages，overset=false。
- InDesign Word import 引入一个源稿不存在的首位 U+FEFF 编码标记，仅此一个已记录控制标记被去除；源稿字符不做 trim、Unicode 或空白归一化。
- PDF 的正文字符与18段源稿串接值完全一致，2581字符，①②③④⑤⑥⑦⑧及末尾“便行文至此。”均存在；标题只出现一次。
- V3 Assembly PASS：73内页、75页Reader、38跨页；星图第29页RIGHT。仅6、28、64为必要 transition。
- 旧正文只替换37个独立验证的数字页脚；PDF 文字/字形位置/字号/颜色状态、图片像素流保持；不以宽松归一化通过验收。
- 已检查新稿两页及七章跨页/整刊缩略图；28个 FROZEN 文件、History全部保护文件、封面和原始71页基线未修改。

V3 完整入口 `tools/run_print_v3.ps1`；静态 `tests/task18.test.cjs`，源核验 `tools/monday_cup_source.py`，PDF `tests/print_book_outputs.py --v3`。后续 TASK19 在此批准状态上新增正式目录，当前整刊入口见 TASK19。

两项既存 Memoir probes 保留且排除提交。History/Interview/Fiction/Memoir/其他 Feature 未重设计。
