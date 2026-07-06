# Round 12 复盘 — 前端样式大改 + 双主题

## AC 完成率: 30/30 | 测试覆盖: 34 新测试 + App.test.tsx 保留 | Blocker: 0 | 结论: 通过

## 完成情况

- [x] A: Tailwind token 封闭（D40）— colors 仅 primary/surface/semantic 三组 + 禁用 arbitrary value
- [x] B: 双主题 + ThemeProvider（D41）— localStorage 持久化 + SSR 降级 + CSS 变量驱动
- [x] C: 8 处 UI 修复（D42-D48）— Skeleton shimmer / EmptyState opacity-60 / Chat 输入区 token / Create sticky / History 时间分组 / Profile ThemeToggle / Layout 暗色 / CardProps
- [x] 测试（D51）— App.test.tsx 新增 34 测试覆盖 token/主题/8 处修复
- [x] 流程合规（D52）— FRONTEND-001/002 升级为 machine-enforced enforcement
- [x] 31 文件改动 100% 命中变更清单

## Blocker

0 个。G0 AI-001/002/003/007 全过，trinity 全绿。

## 流程亮点

**本轮是首个全流程合规轮次**。完整走完 G1→G3→G4→G5→G7 五角色：
1. BA 写 PRD（30 AC，覆盖正常/边界/错误三类）
2. Tech Lead 写 Tech-Spec（D40-D52 共 13 条决策，每条含拒绝方案）
3. test-writer 写红色测试（34 个 App.test.tsx 用例先 fail）
4. impl-writer 实现转绿（31 文件改动 + spec-binding 注解）
5. Reviewer 审核通过（3 项低风险 Spec 偏离已在代码注释中标明）

对比 R7-R10 流程违规（跳过 Spec 直接编码），R11 部分合规（代码+回溯文档），R12 实现了"先文档后代码"的完整链路。

## 教训

- **L22 — AI-001/002/003/007 标 `[advisory]` 是结构性漏洞**：DeepSeek V4 Flash 等轻量模型完全忽视 advisory 规则。修复：4 条规则全部升级为 machine-enforced，通过 `git diff` 检测本次改动文件，强制 (a) 改源码必须同步改 PRD/Tech-Spec (b) 改源码必须同步改测试 (c) 改源码 basename 必须在 Tech-Spec 变更清单中 (d) 改 PRD 必须同步改测试。enforcement 项数 18→22。
- **L23 — `execSync` 默认 1MB maxBuffer 是隐藏陷阱**：当 `.gitignore` 漏 `.pnpm-store/` 时，`git ls-files --others` 输出 1MB+ 触发异常被 try/catch 静默吞掉，导致 G0 门禁"假合规"。修复：(a) `.gitignore` 加 `.pnpm-store/` (b) `GIT_EXEC_OPTS.maxBuffer = 10MB`。教训：所有 `execSync` 调用必须显式设置 `maxBuffer`，且 catch 块不能完全静默。
- **L24 — CI 必须用 `BASE_REF` 触发 G0 流程门禁**：仅靠本地 `git diff HEAD` 在干净工作树时会 advisory skip，无法拦截"提交时跳过 Spec"的违规。修复：CI workflow 在 PR 事件设置 `BASE_REF=origin/{base_ref}` + `fetch-depth: 0`。push 事件不设 BASE_REF（推到 main 后工作树即 HEAD，门禁 advisory skip 是预期行为）。

## 反推

- **规则层**：check-rules.mjs 新增 4 个 enforcement 分支（AI-001/002/003/007 machine-enforced），enforcement 项数 18→22
- **CI**：`.github/workflows/ci.yml` 在 PR 事件设置 `BASE_REF=origin/${{ github.base_ref }}` + `fetch-depth: 0`（L24 反推）
- **gitignore**：根 `.gitignore` 增加 `.pnpm-store/`（L23 反推）
- **脚本**：`scripts/check-rules.mjs` 中 `GIT_EXEC_OPTS.maxBuffer = 10 * 1024 * 1024`（L23 反推）
- **前端规则**：新增 `.trae/rules/frontend/FRONTEND-001.md` + `FRONTEND-002.md`（L21 反推）
- **工具链**：apps/web 引入 `eslint-plugin-tailwindcss` + `vitest` jsdom 环境
