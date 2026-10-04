# Production Skill Bridge — `indesign-publication-production`

本任务明确使用：
https://github.com/KQ-KUN/indesign-publication-production

## 使用优先级

1. 如果 Codex 环境已经安装该 Skill，显式调用：
   `$indesign-publication-production`
2. 如果尚未安装，不要把它 vendor 到《山》仓库。
   以只读方式读取该仓库：
   - `SKILL.md`
   - `references/indesign-runtime-guardrails.md`
   - `references/external-artwork.md`
   - `scripts/check_frozen_scope.py`
   - `scripts/inspect_pdf_artwork.py`
3. 可以临时 clone 到 publication repo 之外的 sibling/temp 目录用于只读校验。
4. 不允许因为引入 Skill 而修改任何 FROZEN 模块。

## 本任务直接采用的规则

- Assembly = combine approved artifacts/modules without reopening design decisions.
- New/modified JSX = UTF-8 BOM.
- Static / native compile / host runtime / visual acceptance 四个层级不得混称。
- Parent spread 不是正文验收对象；结束时 focus actual document page.
- DOM collection 做 defensive access，不无条件 `.item()`.
- Runtime assertion 要验证真实 document/story/frame/link/overset。
- approved cover PDF 必须作为一个 linked artwork，不能 JSX 重建。
- Frozen scope 在 commit 前必须检查。
- PDF artwork 必须检查页数、rotation、Media/Crop/Trim/Bleed/ArtBox、hash。

## 可复用 helper

优先直接运行该 Skill 仓库中的只读 helper；若路径不便，也可以在本任务 runner 中实现等价只读检查，但不要复制成新的“框架”。

示例：
- `python scripts/check_frozen_scope.py <shan-repo>`
- `python scripts/inspect_pdf_artwork.py <cover.pdf> --pages 1 --trim-mm 185 260 --bleed-mm 3`

目标不是增加依赖，而是少踩已经总结过的 InDesign 生产坑。
