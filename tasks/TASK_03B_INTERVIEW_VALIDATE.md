# TASK 03B — Interview Module Validation / Sample 2
READ ONLY:
- AGENTS.md
- spec/WORD_STYLE_MAP.md
- spec/INTERVIEW_CONTRACT.md
- workflow/MODULE_STATUS.json
- manuscripts/01_interview_肖兆旭_河流.docx
- existing `modules/interview.jsx`
- existing `build/03_interview_test.jsx`
- tasks/TASK_03B_INTERVIEW_VALIDATE.md

Foundation and Chapter are FROZEN. Interview is implemented but not frozen.

## Goal
用第二篇真实采访稿验证现有 Interview 积木的可复用性。不要重新设计 Interview。

## Required
1. 将 `manuscripts/01_interview_肖兆旭_河流.docx` 作为第二测试样本；
2. 优先复用现有 `modules/interview.jsx`，不得为肖兆旭写一套文章专用逻辑；
3. 可创建新的最小测试入口 `build/03b_interview_xiao_test.jsx`，或把现有测试入口改造成明确参数化入口；
4. 不得通过“河流：”“肖兆旭：”、问号、粗体等文本语义判断 Q/A；只使用 Word Paragraph Styles；
5. 验证标题、副标题、作者、Metadata、InterviewQuestion、InterviewAnswer 映射；
6. 验证自动续页、B-INTERVIEW Parent、overset 检测；
7. 记录页数与段落数，但不把页数当最终视觉目标；
8. 所有新建/修改 JSX 使用 UTF-8 BOM；
9. 如果第二样本暴露通用模块 Bug，只允许做最小通用修复，并更新测试；如果没有 Bug，不修改 `modules/interview.jsx`；
10. 不修改 Foundation / Chapter；
11. 不做字体、Q/A视觉、页眉页脚、图片或最终版式设计。

## Acceptance
- 肖兆旭稿完整导入；
- Word Styles 映射正确；
- 自动续页完成；
- 最终 `story.overflows == false`；
- 无文章专用 hard-code；
- 邵珠瑜样本测试仍通过；
- Foundation / Chapter 冻结文件未变化。

## Status
本轮成功后仍不要自动冻结 Interview。完成实机测试后由用户确认，再单独执行 freeze commit/tag。

## Git
开始前检查 git status / MODULE_STATUS。完成后运行 Foundation、Chapter、Interview 两样本测试与必要宿主编译测试；检查 `git diff --check`；创建独立 commit 并 push。建议 commit：
`test: validate interview module with Xiao Zhaoxu`

回复不超过8行：commit hash、修改文件、是否改动 interview.jsx、测试结果、InDesign 入口。
