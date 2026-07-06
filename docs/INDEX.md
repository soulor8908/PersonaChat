# PersonaChat 文档索引

> 最后更新: 2026-07-06 | 覆盖轮次: R1-R13 | 文档总数: 42

> 本索引列出 PersonaChat 仓库中所有 Markdown 文档，按类型分组。每条含简短描述与文件路径。

---

## 一、工作流与上下文

- [AGENTS.md](../AGENTS.md) — AI Agent 工作手册（项目级规则与门禁速查）
- [docs/workflow/spec-first-workflow.md](workflow/spec-first-workflow.md) — Spec-First 工作流（7 阶段流水线 + 5 角色提示词）
- [docs/context-snapshot.md](context-snapshot.md) — 项目上下文快照（架构 + 规则速查 + 路由表 + 契约速查）
- [docs/retro/lessons-learned.md](retro/lessons-learned.md) — 教训索引（按轮次反推）

## 二、PRD（按轮次）

| 轮次 | 文件 | 标题 | 状态 |
|------|------|------|------|
| R1 | [docs/prd/R1-monorepo-refactor.md](prd/R1-monorepo-refactor.md) | 项目重构为 AI-Native 架构 | 回溯补齐 |
| R2 | [docs/prd/R2-persona-domain-complete.md](prd/R2-persona-domain-complete.md) | 人格域完整实现 + 可运行验证 | 回溯补齐 |
| R3 | — | 与 R2 合并（见 [persona-crud.tech.md](spec/persona-crud.tech.md)） | 合并 |
| R4 | — | Spec-Binding 引入（见 [backrefactor-r3-r6-spec-gap.md](spec/backrefactor-r3-r6-spec-gap.md)） | 缺失已说明 |
| R5 | — | 前端历史分页（见 [backrefactor-r3-r6-spec-gap.md](spec/backrefactor-r3-r6-spec-gap.md)） | 缺失已说明 |
| R6 | — | Spec-Binding 收尾（见 [backrefactor-r3-r6-spec-gap.md](spec/backrefactor-r3-r6-spec-gap.md)） | 缺失已说明 |
| R7 | [docs/prd/R7-ai-native-experience.md](prd/R7-ai-native-experience.md) | AI Native 深度体验 | 回溯补齐 |
| R8 | [docs/prd/R8-persona-marketplace.md](prd/R8-persona-marketplace.md) | 人格市场 + 工坊 | 回溯补齐 |
| R9 | [docs/prd/R9-tool-use.md](prd/R9-tool-use.md) | Tool Use / Function Calling | 回溯补齐 |
| R10 | [docs/prd/R10-web-client-pwa.md](prd/R10-web-client-pwa.md) | Web 客户端 + PWA | 回溯补齐 |
| R11 | [docs/prd/R11-miniprogram-parity.md](prd/R11-miniprogram-parity.md) | 小程序功能对齐 Web 端 | 回溯补齐 |
| R12 | [docs/prd/R12-frontend-style-overhaul.md](prd/R12-frontend-style-overhaul.md) | 前端样式大改 + 双主题 | 已交付 |
| R13 | — | 文档完整性审计（无 PRD，见 [backrefactor-r13-doc-audit.md](spec/backrefactor-r13-doc-audit.md)） | 审计回溯 |

## 三、Tech-Spec（按轮次）

| 轮次 | 文件 | 标题 |
|------|------|------|
| R2/R3 | [docs/spec/persona-crud.tech.md](spec/persona-crud.tech.md) | 人格域 CRUD + 同步脚本 Tech-Spec（D1-D8） |
| R4-R6 | [docs/spec/backrefactor-r3-r6-spec-gap.md](spec/backrefactor-r3-r6-spec-gap.md) | R3-R6 文档缺口说明（回溯 Spec） |
| R7 | [docs/spec/R7-ai-native.tech.md](spec/R7-ai-native.tech.md) | AI Native 深度体验 Tech-Spec（D8-D13） |
| R8 | [docs/spec/R8-marketplace.tech.md](spec/R8-marketplace.tech.md) | 人格市场 + 工坊 Tech-Spec（D14-D15） |
| R9 | [docs/spec/R9-tool-use.tech.md](spec/R9-tool-use.tech.md) | Tool Use Tech-Spec（D16-D19） |
| R10 | [docs/spec/R10-web-client.tech.md](spec/R10-web-client.tech.md) | Web 客户端 + PWA Tech-Spec（D20-D23） |
| R11 | [docs/spec/miniprogram-parity.tech.md](spec/miniprogram-parity.tech.md) | 小程序功能对齐 Tech-Spec（D1-D7 独立编号） |
| R12 | [docs/spec/R12-frontend-style-overhaul.tech.md](spec/R12-frontend-style-overhaul.tech.md) | 前端样式大改 Tech-Spec（D40-D52） |
| R12 | [docs/spec/backrefactor-r12-impl-deviations.md](spec/backrefactor-r12-impl-deviations.md) | R12 实现 Spec 偏离记录（D-1/D-2/D-3） |
| R13 | [docs/spec/backrefactor-r13-doc-audit.md](spec/backrefactor-r13-doc-audit.md) | R13 文档审计修复回溯 Spec（D-4/D-5/D-6/D-7） |

## 四、Review 报告（按轮次）

| 轮次 | 文件 |
|------|------|
| R1 | [docs/review/R1-monorepo-refactor-review.md](review/R1-monorepo-refactor-review.md) |
| R2 | [docs/review/R2-persona-domain-complete-review.md](review/R2-persona-domain-complete-review.md) |
| R3 | [docs/review/R3-persona-stats-review.md](review/R3-persona-stats-review.md) |
| R4 | [docs/review/R4-spec-binding-review.md](review/R4-spec-binding-review.md) |
| R5 | [docs/review/R5-frontend-pagination-review.md](review/R5-frontend-pagination-review.md) |
| R6 | [docs/review/R6-spec-binding-cleanup-review.md](review/R6-spec-binding-cleanup-review.md) |
| R7 | [docs/review/R7-ai-native-review.md](review/R7-ai-native-review.md) |
| R8 | [docs/review/R8-marketplace-review.md](review/R8-marketplace-review.md) |
| R9 | [docs/review/R9-tool-use-review.md](review/R9-tool-use-review.md) |
| R10 | [docs/review/R10-web-client-review.md](review/R10-web-client-review.md) |
| R11 | [docs/review/R11-miniprogram-parity-review.md](review/R11-miniprogram-parity-review.md) |
| R12 | [docs/review/R12-frontend-style-overhaul-review.md](review/R12-frontend-style-overhaul-review.md) |

## 五、复盘（按轮次）

| 轮次 | 文件 |
|------|------|
| R1 | [docs/retro/round-1.md](retro/round-1.md) |
| R2 | [docs/retro/round-2.md](retro/round-2.md) |
| R3 | [docs/retro/round-3.md](retro/round-3.md) |
| R4 | [docs/retro/round-4.md](retro/round-4.md) |
| R5 | [docs/retro/round-5.md](retro/round-5.md) |
| R6 | [docs/retro/round-6.md](retro/round-6.md) |
| R7 | [docs/retro/round-7.md](retro/round-7.md) |
| R8 | [docs/retro/round-8.md](retro/round-8.md) |
| R9 | [docs/retro/round-9.md](retro/round-9.md) |
| R10 | [docs/retro/round-10.md](retro/round-10.md) |
| R7-R10 合并 | [docs/retro/round-7-10-procedural-violation.md](retro/round-7-10-procedural-violation.md) — 流程违规合并复盘 |
| R11 | [docs/retro/round-11.md](retro/round-11.md) |
| R12 | [docs/retro/round-12.md](retro/round-12.md) |
| 索引 | [docs/retro/lessons-learned.md](retro/lessons-learned.md) — 教训索引（L1-L24） |

## 六、Round Delta（增量上下文）

| 轮次 | 文件 |
|------|------|
| R1 | [docs/round-1-delta.md](round-1-delta.md) |
| R2 | [docs/round-2-delta.md](round-2-delta.md) |
| R3 | [docs/round-3-delta.md](round-3-delta.md) |
| R4 | [docs/round-4-delta.md](round-4-delta.md) |
| R5 | [docs/round-5-delta.md](round-5-delta.md) |
| R6 | [docs/round-6-delta.md](round-6-delta.md) |
| R7 | [docs/round-7-delta.md](round-7-delta.md) |
| R8 | [docs/round-8-delta.md](round-8-delta.md) |
| R9 | [docs/round-9-delta.md](round-9-delta.md) |
| R10 | [docs/round-10-delta.md](round-10-delta.md) |
| R11 | [docs/round-11-delta.md](round-11-delta.md) |
| R12 | [docs/round-12-delta.md](round-12-delta.md) |

## 七、规划与计划

- [docs/ai-native-transformation-plan.md](ai-native-transformation-plan.md) — AI-Native 转型计划
- [docs/test-design.md](test-design.md) — 测试设计文档
- [docs/test-plan.md](test-plan.md) — 测试计划
- [docs/deploy-guide.md](deploy-guide.md) — 部署指南

## 八、最终评审

- [docs/final-review.md](final-review.md) — 最终评审报告
- [docs/project-review.md](project-review.md) — 项目复盘评审

---

## 文档统计

| 类型 | 数量 |
|------|------|
| PRD | 8（R1, R2, R7-R12；R3 与 R2 合并；R4-R6 缺失已说明；R13 无 PRD） |
| Tech-Spec | 10（R2/R3 合并 + R4-R6 回溯 + R7-R12 + R12 偏离回溯 + R13 审计回溯） |
| Review | 12（R1-R12 全覆盖） |
| Retro | 14（12 轮 + R7-R10 合并 + lessons-learned 索引） |
| Round Delta | 12（R1-R12 全覆盖） |
| 工作流 / 上下文 | 2 |
| 规划 / 计划 | 4 |
| 评审 | 2 |
| **合计** | **64** |

> 注：合计含本 INDEX.md 与各类独立文档；不含 `.trae/rules/` 下的规则文档。
