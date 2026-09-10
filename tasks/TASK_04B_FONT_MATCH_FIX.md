# TASK 04B — Font Matcher Hotfix
目的：只修复已被 InDesign 实机诊断确认的字体匹配问题，不做任何视觉重设计。

已知宿主事实：
- `思源黑体 Regular` 存在，postscript=`SourceHanSansSC-Regular`
- `思源黑体 Medium` 存在
- 两者均 `status=INSTALLED`
- `Normal` 也存在
- 当前 Visual System 对 Medium 匹配成功，但对 Regular 请求返回 `MISSING APPROVED FONT`

本包已提供完整替换文件：`visual/typography.jsx`。
不要重新生成这份文件；先 diff/review，再直接采用。

改动原则：
1. 仅增强 `chooseFont()` 的字符串规范化和 Regular/Normal alias；
2. 同一批准字体家族内优先 exact requested style；
3. requested Regular：先真正 Regular，找不到才接受 Normal；
4. requested Medium/SemiBold 等：精确字重不存在时才回退同家族 Regular/Normal；
5. 不改 `VISUAL_TOKENS.json`；
6. 不改 Foundation / Chapter / Interview；
7. 不改 Running System、Chapter layout、Interview layout；
8. 保持 JSX UTF-8 BOM。

验证：
- Node/现有四套回归测试；
- 最小增加一个 matcher 测试：Regular、Normal alias、Medium exact；
- `git diff --check`；
- InDesign 运行 `build/04_visual_system_test.jsx`；
- 目标：P_Article_Subtitle / P_Metadata / P_Section_Title_EN / P_Caption 不再 MISSING，P_Author / P_Interview_Q 继续 Medium。

如果提供的替换文件存在明显语法/API问题，只做最小修复并说明；不要扩展范围。
建议 commit：`fix: normalize approved font style matching`
Visual System 仍不冻结，等用户看到最终字体报告后再决定。
