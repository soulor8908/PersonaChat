# R7 增量上下文
> 2026-07-05 | from: round-6

## 上轮教训

**R6 Spec-Binding 收尾 + 复盘机制补齐**：D8 幽灵引用修复，Spec-Binding 机制完整闭环（D1-D8 双向绑定）。lessons-learned.md 首次整理，反推 META-005 规则"复盘必写入"。

R7 是 PersonaChat 从"demo 级"到"产品级"的关键跃迁。

## 本轮约束

| 规则 | 要求 |
|------|------|
| AI-001 | Spec-First（advisory — **本轮违规**） |
| AI-002 | 测试先行（advisory） |
| AI-004 | 每次改动跑 trinity |
| AI-007 | E2E 验收（advisory） |
| ARCH-001 | 单向依赖 |
| SEC-003 | 路由层 Zod.parse() |
| CODE-001 | 禁止 `any` |
| CODE-002 | 禁止吞错误 |

> ⚠️ **本轮流程违规**：跳过 Spec-First，PRD/Tech-Spec 在编码时不存在，事后回溯补齐。详见 retro/round-7-10-procedural-violation.md

## 关键决策（D8-D13）

D8 SSE 流式用 Web Streams API 零缓冲 · D9 流式路由独立保留向后兼容 · D10 对话分支用 parent_record_id + branch_index 双字段 · D11 评级用单表 rating 字段 SQL 聚合 · D12 人格记忆用关键词匹配零向量数据库 · D13 LLM 可观测自建 llm_call_logs 表零 SaaS 依赖

## 文件改动清单摘要

| 类别 | 文件数 | 关键文件 |
|------|--------|---------|
| 后端路由 | 1 | router/chat.router.ts（POST /stream + GET /branches + PUT /rate） |
| 后端 server | 1 | server.ts（GET /api/admin/metrics） |
| 后端 domain | 3 | domain/{llm,memory}.ts + 新建 chat-helpers.ts（拆分自 chat-svc） |
| 后端 repository | 2 | repository/{chat,memory}-repo.ts |
| 后端 service | 1 | service/chat-svc.ts（流式 chat 入口 + 分支创建） |
| 数据库 schema | 1 | apps/api/schema.sql（ALTER 3 列 + 2 新表） |
| contracts | 2 | schemas/{chat,persona}.ts（streamEventSchema + personaStatsSchema） |
| 测试 | 2 | test/chat.e2e.test.ts（R7-R19） + test/chat-svc.test.ts（F4/F5） |

## 风险点

| 风险 | 等级 | 缓解 |
|------|------|------|
| 跳过 Spec-First 流程违规 | **P0** | R11/R12 通过 AI-001 升级 machine-enforced 修复 |
| 多轮连续交付流水线模式 | 高 | R11/R12 通过 AGENTS.md Step 0 自查清单修复 |
| LLM 5xx 错误客户端体验 | 中 | SSE error 事件 + 客户端 toast 提示 |
| 记忆提取每次对话触发（成本） | 中 | PRD BLOCKING Q&A Q1 待后续迭代 |
| admin/metrics 无鉴权 | 中 | SEC-001 advisory，生产前补齐 |

## 最近提交

- 6b96f84 @ feat: AI Native 改造完成 — PersonaChat v2.0

## 快速链接

- 全量上下文: [context-snapshot.md](../context-snapshot.md)
- 上轮复盘: [round-6.md](retro/round-6.md)
- 本轮复盘: [round-7.md](retro/round-7.md)
- 流程违规复盘: [round-7-10-procedural-violation.md](retro/round-7-10-procedural-violation.md)
- 教训索引: [lessons-learned.md](retro/lessons-learned.md)
- 工作流: [spec-first-workflow.md](workflow/spec-first-workflow.md)
- AI 手册: [AGENTS.md](../../AGENTS.md)
