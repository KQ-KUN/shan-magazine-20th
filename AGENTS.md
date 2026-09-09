# AGENTS.md — 《山》InDesign Project

Project:
《山》——山东大学学生科幻协会二十周年纪念刊
2006—2026

## Role

You are the implementation engineer.
Do not redesign the magazine.

## Source of truth

Visual parameters:
spec/MAGAZINE_SPEC.md

Article order and metadata:
spec/CONTENT_MANIFEST.json

Module interfaces:
spec/INPUT_CONTRACTS.md

Word style mappings:
spec/WORD_STYLE_MAP.md

Current module status:
workflow/MODULE_STATUS.json

Current task:
tasks/TASK_XX_*.md

Execution environment:
spec/ENVIRONMENT.md

## Reading rule

Read only files required by the current TASK.

Do not scan:
- all manuscripts
- all images
- reference magazines
- unrelated frozen modules
- old exports

unless explicitly requested.

## Architecture

core/ = reusable document infrastructure
modules/ = independent layout blocks
build/ = thin assembly scripts
data/ = structured editorial data
workflow/ = status, Git and debugging rules
tasks/ = one bounded task at a time

Do not create one monolithic magazine script.

## Frozen modules

Before editing core/ or modules/, read:
workflow/MODULE_STATUS.json

FROZEN modules are read-only unless:
1. the current task explicitly targets that module for a Bug fix; and
2. the fix is minimal.

If another frozen module appears to require changes:
stop and report instead of editing it.

## Coding rule

Prefer:
- small reusable functions
- manifest-driven behavior
- explicit interfaces
- minimal diffs
- deterministic layout
- isolated module tests

Avoid:
- final page-number hard coding
- semantic interpretation of manuscripts
- duplicated article-specific code
- unrelated refactors
- speculative API use

## InDesign

所有新创建或修改的 `.jsx` 源文件必须保存为 UTF-8 with BOM。InDesign 2026 原生 `#include` 已验证会因无 BOM 的编码识别问题产生 Error 14；Node 解析通过不能代替宿主编译检查。相关自动测试必须检查 BOM，语法或编码修复应运行原生编译测试。已有 FROZEN Foundation 文件保持原样，不为统一编码修改冻结文件。

Use the environment defined in:
spec/ENVIRONMENT.md

If an API cannot be verified:
add:

// TODO: VERIFY INDESIGN API

Do not guess.

## Git rule

Before changing files:
1. inspect the working tree;
2. identify the exact files the current task is allowed to modify;
3. do not modify unrelated files.

After completing a task:
1. review the diff;
2. report unexpected changed files;
3. do not commit unrelated changes together.

If GitHub sync is available, keep commits module-scoped.

## Output

Write files directly to the workspace.

Do not paste complete source files into chat unless explicitly requested.

Normal final reply:
1. files changed
2. TODOs
3. test steps
4. unexpected diff, if any

Keep the reply concise.
