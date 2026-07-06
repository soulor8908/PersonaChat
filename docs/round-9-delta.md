# R9 增量上下文
> 2026-07-05 | from: round-8

## 上轮教训

**R8 人格市场 + 工坊**：sort 参数 + PersonaSummary + 热门推荐 + 预览接口 + 三段式布局。测试数 64→69。但**流程违规**持续 — 跳过 Spec-First。教训 L17 重申。

R9 完成"Tool Use / Function Calling 全链路"。

## 本轮约束

| 规则 | 要求 |
|------|------|
| AI-001 | Spec-First（advisory — **本轮违规**） |
| AI-002 | 测试先行（advisory — **PRD 原"无新增测试"被 Tech-Spec 修正**） |
| AI-004 | 每次改动跑 trinity |
| AI-005 | 禁止硬编码跨域可变集合，用 SSOT 派生 |
| SEC-003 | 路由层 Zod.parse() |
| CODE-001 | 禁止 `any` |
| CODE-002 | 禁止吞错误 |

> ⚠️ **本轮流程违规**：跳过 Spec-First，PRD/Tech-Spec 在编码时不存在，事后回溯补齐。

## 关键决策（D16-D19）

D16 工具定义在 contracts SSOT toOpenAITools 派生 · D17 Message Schema 扩展 content 改 nullable 加 tool_calls · D18 Tool Use 循环在 service 层 while loop 最多 5 轮 · D19 工具执行器在 domain 层纯函数 + Function strict mode 沙箱

## 文件改动清单摘要

| 类别 | 文件数 | 关键文件 |
|------|--------|---------|
| contracts 新建 | 1 | schemas/tool.ts（toolRegistry SSOT + toOpenAITools） |
| contracts 修改 | 2 | schemas/{chat,persona}.ts（tool 角色扩展 + tools 字段） |
| 后端 domain 新建 | 1 | domain/tool-executor.ts（runTool 统一入口） |
| 后端 domain 修改 | 1 | domain/llm.ts（callLLM 加 tools 参数） |
| 后端 service | 1 | service/chat-svc.ts（while loop + tool_calls 注入） |
| 后端 router | 1 | router/chat.router.ts（支持 tools 字段 + SSE tool 事件） |
| 数据库 schema | 1 | apps/api/schema.sql（personas ALTER tools） |
| 测试新建 | 2 | test/tool-executor.test.ts + contracts/test/tool.test.ts |
| 测试扩展 | 2 | test/chat.e2e.test.ts + contracts/test/chat.test.ts |

## 风险点

| 风险 | 等级 | 缓解 |
|------|------|------|
| 跳过 Spec-First 流程违规 | **P0** | R11/R12 通过 AI-001 升级 machine-enforced 修复 |
| Tool Use 循环无总超时 | 中 | 最坏 5 轮 × 10s = 50s，后续迭代加总超时 |
| web_search 未配置 KEY 时 LLM 反复尝试 | 中 | 应在 service 层提前过滤掉未配置 KEY 的工具 |
| calculator 沙箱安全性 | 低 | Function strict mode + 字符白名单已足够（CF Workers 不支持 vm） |

## 最近提交

- 6b96f84 @ feat: AI Native 改造完成 — PersonaChat v2.0

## 快速链接

- 全量上下文: [context-snapshot.md](../context-snapshot.md)
- 上轮复盘: [round-8.md](retro/round-8.md)
- 本轮复盘: [round-9.md](retro/round-9.md)
- 流程违规复盘: [round-7-10-procedural-violation.md](retro/round-7-10-procedural-violation.md)
- 教训索引: [lessons-learned.md](retro/lessons-learned.md)
- 工作流: [spec-first-workflow.md](workflow/spec-first-workflow.md)
- AI 手册: [AGENTS.md](../../AGENTS.md)
