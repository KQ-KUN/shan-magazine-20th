# TASK — 《山》封底双版本接入（电子版 + 印刷版候选）

## 目标与授权范围
用户已提供两份封底 PDF，要求配合《山》电子版和未来的纸质印刷版交给 Codex。**这两份用户原 PDF 经逐像素渲染比较视觉一致**，均为一页、279.4 × 394.229 mm，均不具备目标成品尺寸/有效印刷出血框。不得猜其中一份原本就是合格的印刷版。

本交接包已经在不改动画面的基础上，生成两份 **可区分用途的规范尺寸候选件**：

- `assets/cover/back/SHAN_BACK_COVER_DIGITAL_185x260.pdf` — **电子版封底**，单页 PDF，185 × 260 mm，无出血。
- `assets/cover/back/SHAN_BACK_COVER_PRINT_CANDIDATE_191x266_BLEED3.pdf` — **印刷候选封底（非送印定稿）**，单页 PDF，Media/Bleed 191 × 266 mm，Trim 185 × 260 mm，四周 3 mm 真正有画面的出血。

两份经过同步裁切，数码版可见内容与印刷候选版裁切后的内容一致。其内容是用户提供的暖白、岩层、轨道、星点的封底图，不得擅自新增文字、会徽、二维码、Logo，也不得重绘、AI修图或修改正封面。

## 预先发现的印刷风险

- 用户原图为 `1056 × 1490 px` 位图嵌入 PDF，换算至印刷候选宽度约 140 PPI，**不满足常见的300 PPI图片质量目标**。当前候选仅用于印刷排版/预检，不能报 `PRINT_READY`。
- 当前文件并未得到印厂指定 CMYK ICC 输出意图、PDF/X 标准、纸型与装订方式。
- **这只是封底单页**，不是 `封底｜书脊｜正封面` 的最终展开印刷稿。书脊宽度尚待印厂依据成书页数/纸张/装订给出。
- 不能靠改 PDF 元数据中的分辨率或简单上采样伪装成真正300 PPI素材。

## 本地仓库与工作区安全

工作仓库 `KQ-KUN/shan-magazine-20th`。先读 `AGENTS.md`、`workflow/MODULE_STATUS.json`、当前 Assembly task/manifest 与 handoff 文件，先执行 `git status`。保留当前 Codex 可能尚未提交的排版改动和诊断文件；不得 `reset/clean/force-push`。本包只要求封底文件接入与电子版 PDF 的末尾结构修改。

**必须显式调用** `$indesign-publication-production` Skill，阅读其 `SKILL.md`、`references/external-artwork.md` 与运行护栏，按仓库已有 JSX/InDesign 流程执行。如果 Skill 未安装或不可访问，先报告阻塞，不得声称已经使用 Skill；Computer Use 仅可辅助检查，不得替代主流程。

## 电子版接入（当轮执行）

1. 把 `SHAN_BACK_COVER_DIGITAL_185x260.pdf` 放入仓库规定的 approved back artwork 位置，并将 Assembly 中 Back Cover 状态更新为 `APPROVED_FOR_DIGITAL`（并非 print approval）。正封面继续原样用 `assets/cover/SHAN_FRONT_COVER_FINAL.pdf`。
2. 在 **电子版阅读 PDF** 最末尾加入完整封底。为模拟实际封面，**封三 (Inside Back Cover) 必须完全空白**，封底在其后，且封底无页码、页眉、额外标志或新增文字。
3. 当前封一/封二机制保持：封一为已批准正封面、封二真正空白。电子版页序应当为：封一 → 封二空白 → 内页（原有章节/正文） → 封三空白 → 封四（本文件）。
4. 严格验证奇偶页与 PDF 双页阅读效果。若内页当前物理页数导致封三/封四左右页错位，先诊断并按装订逻辑加必要的 **明确记录的内页补白**；不得随手在任意位置插白页，更不得破坏内页奇偶页、章节右页、目录引用。无法安全处理须阻塞并说明，不要静默错装。
5. 书底不要计入 interior printed folio，目录条目及真实文章页码保持正确；电子版封底和封三不进入目录。
6. 产物命名使用与现有工程一致的新版电子版 PDF（例如 `SHAN_EBOOK_VNEXT.pdf`）；不要覆盖用户已经批准的旧 V8 文件而无备份。
7. 允许接入电子版封底时将电子版 Review/Assembly 中封底 pending 状态独立解锁，但不要提前宣称整个印刷封面已完成。

## 印刷版接入（仅留档与预检；暂不生成整张送印稿）

1. 把 `SHAN_BACK_COVER_PRINT_CANDIDATE_191x266_BLEED3.pdf` 放入明确带有 `PRINT_CANDIDATE` 标记的位置（与电子版 PDF 分开）。
2. 检查页数1、TrimBox 185 × 260 mm、MediaBox/BleedBox 191 × 266 mm、rotation0、图形铺至 bleed、PDF 可解析；输出原始素材 hash 与 preflight 报告。
3. **status 固定为 `PRINT_CANDIDATE_NOT_APPROVED`。** 记录约140 PPI图片限制、色彩输出意图待印厂确认、书脊宽度待定、封面展开稿尚未生成。
4. 当前不转换 CMYK、不伪造 PDF/X、不自行设定书脊宽度、不使用候选封底直接送印，也不要把电子版封底重复放进正式内页印刷 PDF。
5. 待最终封底高清母图、内页确定、装订/用纸/书脊厚度及印厂 ICC/PDF 规范明确后，再把此图整合进 `封底 + 书脊 + 正封面` 展开稿，进行最终印前预检/实体打样。
6. 封二、封三原则维持完全不印刷，不得用章节 transition artwork 替换。

## 代码与冻结范围

- 仅改资产登记、必要的 Assembly 电子版封面拼接、相关 manifest/report/测试、最小运行脚本，不改 interview/history/fiction/memoir/feature/chapter/intro/星岳正文、现有正封面。
- 如果总装需要改变 Frozen 模块，停止并报告，不要借机调整版式。
- 保留原始上传 PDF 供溯源，但两个原 PDF 视觉相同，通常只需保留一个在仓库源资产位置，避免重复仓库体积；交接 ZIP 内两份原件均已附。

## Codex 必须自己验收

- 静态：上述文件存在、JSON状态分离正确、Git diff 仅在允许范围、`git diff --check` PASS。
- Host：若本机 InDesign 可用，自己运行集成脚本，不能仅凭静态测试就宣称成功；自动生成新电子版。
- PDF：渲染末尾至少3页，验证封三真的无内容，封四的用户画面未变；检查实际页序和奇偶边；电子版封底尺寸185 × 260 mm。
- Print candidate：校验 Trim/Media/Bleed、旋转、无明显可见边缘白条；始终报告未通过高分辨率/ICC/印厂送印批准。
- 若本机 InDesign/COM 不可用，标明 `HOST_RUNTIME_BLOCKED`，不能说已经集成成功。
- 每条失败都记录 stage 与根因，自己解决可处理错误，不让用户承担基本脚本排错。

## 最终回复（简明）

给出：commit hash（如已成功验证并提交）；电子版 PDF 保存路径；封底对应电子版的实际 PDF 页号；封三是否空白；电子版页数与单双页 PASS；印刷候选文件路径/尺寸；仍待印厂确认的事项；静态、host-runtime、PDF验证状态。**不要将此印刷候选文件描述为最终可送印文件。**
