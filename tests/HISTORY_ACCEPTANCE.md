# History fixed tail override（恢复未命名-9基线，仅固定第6—7页）

本轮停止并移除 `2049cfc` 的尾页自动压缩方向。该提交只改过4个History文件，均先从其父提交 `617e033ddfa832f0a64015bddd243ed5009e6dca` 恢复，再添加本轮明确布局；没有整仓库revert/reset，没有回滚任何FROZEN模块或其他项目文件。保留更早的ExtendScript保留字修复。

参考PDF实物：桌面 `未命名-9.pdf`，SHA-256=`f472357839f6ca21fb01fb26d82f15a2495cb9f9ad3e40d6085e77c30efe3b16`，7页，InDesign21.5导出元数据CreationDate=2026-10-03 00:07:13 +08:00。git的617e033在2026-10-02 23:17:37，2049cfc在2026-10-03 00:31:00；现有runtime report同样记录7页。PDF没有嵌入commit，本次据这一时间链、源码历史和用户“上一版”指向选择617e033作为恢复基线。读取并渲染了参考PDF第5—7页：第5页结束于P186/P187的2024年末星海邀约及海报，P188月曜杯从第6页开始。渲染缓存在ignored exports/history，仅用于本轮读取参考，不是新版本验收产物。

新建 `content/HISTORY_TAIL_LAYOUT.json`，只存源段落索引、图索引、固定页面/栏、段落布局属性和参考文件哈希；不存正文副本。四个固定栏块连续覆盖全部P188—P216：

| 页面/栏 | 源段落 | 原图片 | 显示宽度 |
| --- | --- | --- | --- |
| 6左 | P188—P193，月曜杯与颁奖，含原图注P190/P193 | 17徽章、18海报、19颁奖照片 | 30、40、54mm |
| 6右 | P194—P208，年度标题、全部名单、原5mm名单间距、星海邀约 | 20海报 | 42mm |
| 7左 | P209—P211，2025年10月文字和两张迎新活动合影 | 21、22 | 各52mm，沿原LF两行纵向排列 |
| 7右 | P212—P216，2026年3月电影院与4月文创 | 23合影、24蓝色海报 | 56、42mm；P215段前12mm形成上下两组 |

前5页使用恢复后的正文样式、名单样式、所有图1—16参数和原2栏/6mm几何，均保持一致。flow只生成五页前段，然后在P188/P194/P209/P212设置display-only NEXT_FRAME/NEXT_COLUMN边界，追加两个固定正文页。没有插入CR/LF/新空段，原空段、24图顺序、年份、原图注及名单顺序不变；主story始终同一条，216段复原规则未放宽。

固定尾部不调用 `compactImages`，不做缩图试探，不添加第8页承接overset，不以6页或任何页数进行优化。四个栏块必须落入指定slot；如无法容纳，则明确报告固定尾部overset/slot错误，保留失败文档供人工检查，不自动动前5页。对创建尾页前后的前5页frame.contents、frame几何、逐行contents/基线/horizontalOffset做module-local比较（几何容差0.2mm），防止尾部keep/换栏牵动锁定区域。引用PDF的前5页能否与新宿主输出完全一致仍需用户实机确认，静态模型不能证明视觉锁定。

全局验收仍检查216源段落逐段一致、21编年、24图/源字节、5图注、比例/链接/字体/重叠、无overset/空尾页、最后focus真实document page。新增tail slot检查全部P188—P216每一行及图17—24的实际page/column/可见layer/anchor lines；图23必须在7右且可见，图24必须在7右且可见，隐藏或误落第6页直接失败。没有丢图/图注或资料缺失文本豁免。

静态测试覆盖恢复的文字/名单和图1—16参数、sidecar事实映射/连续段落、固定4slot、仅追加2页、禁用自动fit、前5页文字/基线变化失败、tail从锁定页开始失败、overset不自动追加页、电影院段无行/海报错栏/照片隐藏/海报错页等失败路径，以及原有诊断/BOM/ES3保留字/字体链接/Parent focus回归。仅运行静态测试、source/frozen检查和diff check；未启动InDesign/COM/GUI，History未冻结。下一步用户同步Scripts Panel后运行 `build/13_history_test.jsx` 并导出PDF。

段落布局属性已核对[Adobe Paragraph DOM](https://developer.adobe.com/indesign/uxp/dom/api/p/paragraph/)与[StartParagraph NEXT_FRAME/NEXT_COLUMN](https://developer.adobe.com/indesign/uxp/dom/api/s/start-paragraph/)；宿主行为仍需实机验证。

# History Compact Image Layout v3（本轮仅静态验证）

用户反馈上一版PDF为10页且末页空白。本轮未启动 InDesign/COM/GUI，必须重新运行 `build/13_history_test.jsx` 并导出新PDF；静态测试不证明实际已压缩至7–9页，也不证明视觉留白已通过。History 未冻结。

全部24图及对应图注改为单栏。原 `HISTORY_IMPORT_MAP.json` 和 `HISTORY_DISPLAY_MAP.json` 不变，旧 Wide 样式仅保留兼容定义并被设为 SINGLE_COLUMN，没有正文段落再使用它们。图片生成完全不读取原模块数量/Word宽度，也没有双栏宽度分支。既有文字篇名、年份、正文、名单字号/字体/颜色和5mm名单间距保留。

`HISTORY_TOKENS.json` v3 图片优选宽度：活动照48–56mm（含旧照片），合影54–64mm，海报40–44mm，档案/截图44mm，拼合档案图58mm，竖向活动照46–52mm，徽章30mm。栏尾允许按每图下限继续缩小：照片40–55mm、海报38mm、档案40mm、徽章25mm。绝对上限70mm，保留原比例、原DOCX裁切和优选145ppi限制；高度自动计算。

图片仍在原段落边界的独立视觉行内，原顺序及年份不变。不增加强制分页、分栏符或正文空段。第一张图不再和整段历史正文一起 keep；无共用图注的多图可分别续栏；仅图片与原图注使用 keepWithNext=1，图注 keepWithNext=0，不连锁锁住后续年份。原浮动图注 Group 保留，图注框高度由12mm压至6mm，字号不变；P189双图和原共用图注保持小单元关系。

续排后有界执行最多2轮栏尾检查，以实际前一行所在栏和剩余高度为依据，按3mm步进尝试缩小。每次 recompose 后检查整张图片/共用图注单元是否真的回到前一栏；失败则恢复小尺寸优选宽度并正常顺延。保持原 source story、锚点、段落与图片字节不变，不靠缩小文字或重排年份压页。

自动清理仅针对本次生成的空白尾页（无正文、无FFFC/图片、无其他本地页面对象），包括无正文框的空尾页。删除后立即验证页数减少、story字符串完全一致及无overset；如只有末尾控制字符发生overset，继续在允许范围内缩小最后一张图，不删除控制字符或source paragraph。若最小尺寸仍无法解决，明确报错，不返回虚假PASS。中间空页会触发错误，有真实内容或其他对象的末页不会被误删。

runtime report 增加 `images_single_column=24`、`blank_tail=false`、`removed_empty_tail_pages`、栏尾缩图记录，以及逐栏 `unused_tail_mm` / `end_of_story`。后续仍有内容的栏若出现超过半栏高度的底部留白，报告 WARNING；自然篇末留白单独标注。7–9页为advisory，密度/留白必须看新PDF，不能作为图片重要性或固定页数断言。

静态测试：既有21编年、216段可逆逐段完整性、24图、5图注、源哈希/BOM/错误诊断/Parent聚焦全部保留；新增所有History专用样式单栏、旧Wide无实际映射、70mm上限及栏内几何容差、keep链、缩图成功/失败恢复/空间不足/比例/共用图注、空尾页与控制字符处理、误删/文字损失/overset/删除无进展失败路径、半栏留白诊断测试。

v3实机待验收重点：

- 所有24图/图片组均为单栏，最大宽度不超70mm，无拉伸/破坏性裁切。
- 2021合影约64mm；星海邀约与月曜杯海报40–44mm；徽章约30mm；后期两张合影约60mm。
- 图注跟随原图片/共享图片单元，无图文重叠、字体/链接异常和overset。
- 不出现纯空白末页；检查 runtime report 的逐栏留白 WARNING 与第6页以后的活动/图片连续性。
- 负责人仍一职务一行（P74共享姓名例外保留），名单与活动间约一行距离；结束 focus actual document page。

# History Visual Refinement v2（此前静态验证记录）

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
