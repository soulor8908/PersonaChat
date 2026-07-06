# R8 增量上下文
> 2026-07-05 | from: round-7

## 上轮教训

**R7 AI Native 深度体验**：流式输出 + 对话分支 + 评价反馈 + 人格记忆 + LLM 可观测性五大特性一次性交付。测试数 48→64。但**流程违规** — 跳过 Spec-First，PRD/Tech-Spec 事后回溯补齐。教训 L17: Plan Mode ≠ Spec 文档。

R8 完成"人格市场 + 工坊"。

## 本轮约束

| 规则 | 要求 |
|------|------|
| AI-001 | Spec-First（advisory — **本轮违规**） |
| AI-002 | 测试先行（advisory） |
| AI-004 | 每次改动跑 trinity |
| AI-005 | 禁止硬编码跨域可变集合，用 SSOT 派生 |
| SEC-003 | 路由层 Zod.parse() |
| ARCH-003 | 小程序只通过 API 通信 |

> ⚠️ **本轮流程违规**：跳过 Spec-First，PRD/Tech-Spec 在编码时不存在，事后回溯补齐。

## 关键决策（D14-D15）

D14 列表统计用 LEFT JOIN + COALESCE 实时聚合不冗余存储 · D15 预览接口不创建草稿 persona 直接用传入 systemPrompt

## 文件改动清单摘要

| 类别 | 文件数 | 关键文件 |
|------|--------|---------|
| 后端 repository | 1 | repository/persona-repo.ts（findAllWithStats + findHot） |
| 后端 service | 1 | service/persona-svc.ts（preview 方法） |
| 后端 router | 1 | router/persona.router.ts（GET /hot + POST /preview + sort 参数） |
| contracts | 1 | schemas/persona.ts（personaSummarySchema + sort 枚举） |
| 小程序前端 | 3 | pages/index/index.{js,wxml,wxss}（三段式布局） |
| Web 前端 | 1 | apps/web/src/pages/Home.tsx（同步三段式） |
| 测试 | 2 | test/persona.e2e.test.ts（sort/hot） + test/chat.e2e.test.ts（preview） |

## 风险点

| 风险 | 等级 | 缓解 |
|------|------|------|
| 跳过 Spec-First 流程违规 | **P0** | R11/R12 通过 AI-001 升级 machine-enforced 修复 |
| 热门推荐权重公式缺时间衰减 | 低 | 后续迭代补齐 |
| 预览接口无独立限流 | 中 | 复用 chatRateLimiter，生产前独立配置 |
| 预览消耗 LLM token | 中 | PRD BLOCKING Q&A Q2 待后续迭代 |

## 最近提交

- 6b96f84 @ feat: AI Native 改造完成 — PersonaChat v2.0

## 快速链接

- 全量上下文: [context-snapshot.md](../context-snapshot.md)
- 上轮复盘: [round-7.md](retro/round-7.md)
- 本轮复盘: [round-8.md](retro/round-8.md)
- 流程违规复盘: [round-7-10-procedural-violation.md](retro/round-7-10-procedural-violation.md)
- 教训索引: [lessons-learned.md](retro/lessons-learned.md)
- 工作流: [spec-first-workflow.md](workflow/spec-first-workflow.md)
- AI 手册: [AGENTS.md](../../AGENTS.md)
