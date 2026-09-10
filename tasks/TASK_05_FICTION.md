# TASK 05 — Fiction Module / Sample 1: 四叠半
前置条件：Foundation / Chapter / Interview / Visual System 必须均为 FROZEN。

## READ ONLY
- AGENTS.md
- workflow/TOKEN_SAVING_RULES.md
- workflow/MODULE_STATUS.json
- spec/MAGAZINE_SPEC.md
- spec/WORD_STYLE_MAP.md（仅通用规则）
- spec/FICTION_CONTRACT.md
- spec/FICTION_TOKENS.json
- spec/FICTION_SAMPLE_01_NOTES.md
- manuscripts/04_fiction_四叠半_笠原JunE.docx
- frozen Foundation / Visual System only as required
- tasks/TASK_05_FICTION.md

不要读取 Interview 稿件、会史、其他小说、整张视觉展板或封面参考。

## Goal
建立可复用的 Fiction 基础积木。第一轮只使用《四叠半》，不做任何作品专属皮肤。

## Create
- modules/fiction.jsx
- visual/fiction_skin.jsx
- build/05_fiction_test.jsx
- tests/fiction.test.js
- tests/FICTION_ACCEPTANCE.md

## Update
- workflow/MODULE_STATUS.json 新增 fiction：
  status=`IMPLEMENTED_PENDING_IND2026_TEST`
  runtimeTested=false
  designValuesPending=true
  frozen=false

## Required
1. 只导入指定 DOCX，不扫描 manuscripts。
2. 使用 Word Paragraph Styles 做确定性映射，禁止在 InDesign 中按文本内容猜类型。
3. 使用 D-FICTION Parent。
4. Body 使用 2 栏 / 6 mm gutter；ArticleTitle / Author 等 opener 跨两栏。
5. FictionChapter 使用 P_Fiction_Chapter，并由 `visual/fiction_skin.jsx` 按 `FICTION_TOKENS.json` 设置样式与跨栏。
6. 自动创建后续 D-FICTION 页面、串联 text frames、检测 overset。
7. 保留全文文字；未知样式明确警告/报错。
8. 作者必须为 `笠原JunE`，不得自行推断或替换。
9. 不做任何 special skin，不启用特殊蓝，不创建作品专属视觉逻辑。
10. 不做图片、插画、脚注、尾注、目录、章节星图 motif。
11. 不修改任何 FROZEN 文件。
12. 所有新建/修改 JSX UTF-8 BOM。

## API / implementation economy
优先复用 Interview 已验证过的 DOCX place/style-map/flow 思路，但不要修改 frozen interview.jsx，也不要复制整套无关逻辑。只提取 Fiction 真正需要的最小通用模式。
若 span-columns API 已在 TASK 04A 实机验证过，复用已验证写法，不重新研究。

## Test
至少验证：指定 DOCX；D-FICTION；作者为笠原JunE；6个 FictionChapter 映射正确；opener/chapter span；Body 2栏；自动续页；无 overset；正文文本校验；frozen 零变化；BOM。

实机入口：`build/05_fiction_test.jsx`

## Git
运行必要回归与 diff check。独立 commit + push，建议 `feat: add fiction module`。
不要冻结 Fiction、不要 tag；需《锡兵》第二样本验证后再冻结。
回复 <=8 行：commit、文件、作者/6章节验证、页数/overset、冻结文件、InDesign入口。
