# R1 增量上下文
> 2026-07-04 | from: 初始

## 本轮目标

将 PersonaChat 从单体结构重构为 AI-Native 架构：monorepo + 契约层 + 四层后端 + 规则体系 + Spec-First 工作流。建立"AI 可读、机器可校验、可自进化"的工程骨架。

## 本轮约束

| 规则 | 要求 |
|------|------|
| AI-001 | 先读 Spec 再写码（首轮无前置 Spec，advisory） |
| AI-002 | 测试先行（首轮无前置测试基线） |
| AI-004 | 每次改动跑 trinity |
| ARCH-001 | 单向依赖：domain ↚ repository/service/router |
| ARCH-002 | 契约层只依赖 zod + typescript + vitest |
| ARCH-003 | 小程序只通过 API 通信，不 import 后端模块 |
| CODE-001 | 禁止 `any` |
| SEC-003 | 路由层 Zod.parse() |

> 全量规则见 `pnpm check` 或 `.trae/rules/`

## 关键决策摘要

首轮无 Dx 决策编号（D1-D8 在 R2/R3 起）。但首轮确定了：
- monorepo 三包结构（contracts + apps/api + apps/miniprogram）
- 后端四层架构（domain/repository/service/router + middleware）
- 16 条规则（AI-001~006 + ARCH-001~003 + CODE-001~004 + SEC-001~003）
- 4 个自动化脚本（check-rules / gen-context-snapshot / gen-round-delta / gen-retro-index）
- Spec-First 工作流 7 阶段（G1→G7）+ 5 角色（BA/Tech Lead/test-writer/impl-writer/Reviewer）

## 文件改动清单摘要

| 类别 | 文件数 | 关键文件 |
|------|--------|---------|
| 根配置 | 4 | package.json / pnpm-workspace.yaml / vitest.config.ts / vitest.workspace.ts |
| contracts 包 | 6 | package.json + tsconfig.json + 4 schemas（persona/chat/common/user） |
| apps/api | 8 | domain/{persona-parser,llm} + repository/{persona,chat}-repo + service/{persona,chat}-svc + router/{persona,chat} + middleware/{cors,error} + server.ts + errors.ts |
| apps/miniprogram | 4 | app.js + app.json + app.wxss + sitemap.json |
| 规则 | 16 | .trae/rules/{ai-behavior,architecture,coding,security}/*.md |
| 脚本 | 4 | check-rules.mjs + gen-context-snapshot.mjs + gen-round-delta.mjs + gen-retro-index.mjs |
| 文档 | 3 | workflow/spec-first-workflow.md + retro/round-1.md + INDEX.md |

## 风险点

| 风险 | 等级 | 缓解 |
|------|------|------|
| contracts `.js` 后缀导入 | 低 | bundler 模式需用 `.js` 扩展名 |
| 小程序不支持 npm 包直接引用 | 中 | API client 手动维护类型；ARCH-003 强制隔离 |
| wrangler.toml 路径迁移 | 低 | 部署文档更新 |
| 首轮无 E2E 测试 | 中 | R2 引入 persona.e2e.test.ts |
| 首轮无鉴权层 | 中 | SEC-001 advisory，生产前补齐 |
| 首轮无 CI 流水线 | 低 | 后续轮次 .github/workflows/ci.yml |

## 最近提交

- (R1 首轮，git 历史未保留完整 commit hash)

## 快速链接

- 全量上下文: [context-snapshot.md](../context-snapshot.md)
- 上轮复盘: (无 — 首轮)
- 本轮复盘: [round-1.md](retro/round-1.md)
- 教训索引: [lessons-learned.md](retro/lessons-learned.md)
- 工作流: [spec-first-workflow.md](workflow/spec-first-workflow.md)
- AI 手册: [AGENTS.md](../../AGENTS.md)
