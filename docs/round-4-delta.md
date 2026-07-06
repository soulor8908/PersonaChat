# R4 增量上下文
> 2026-07-05 | from: round-3

## 上轮教训

**R3 引入 Superpowers TDD + Spec-Binding 雏形**：测试数 22→48，新增 13 个 CRUD E2E + persona-parser 边界 + chat-svc 单元。但发现 3 项质量问题：
- Mock D1 UPDATE handler params offset 错误（SET 与 WHERE 子句索引混合）
- Rate-limit 全局 Map 在 E2E 测试间累积请求计数
- `updated!` 非空断言（CODE-001 精神违规）
- Spec-Binding `D#:` 注释格式与 regex 不兼容（冒号后跟中文）

R4 修复上述问题 + 引入完整 Spec-Binding 机制 + 前端 SSOT。

## 本轮约束

| 规则 | 要求 |
|------|------|
| AI-001 | Spec-First（advisory） |
| AI-002 | 测试先行（advisory） |
| AI-004 | 每次改动跑 trinity |
| AI-005 | 禁止硬编码跨域可变集合，用 SSOT 派生 |
| ARCH-001 | 单向依赖 |
| SEC-003 | 路由层 Zod.parse() |
| CODE-001 | 禁止 `any`（含 `!` 非空断言精神违规） |

> 全量规则见 `pnpm check` 或 `.trae/rules/`

## 关键决策摘要

- **Spec-Binding 机制引入**：D1-D7 共 7 个决策首次完整标注到代码；`scripts/check-spec-binding.mjs` 实现 Spec ↔ Code 双向追溯
- **前端 SSOT**：`GET /api/models` 后端 SSOT 下发；前端 modelKeys 从硬编码改为 API 获取 + local fallback
- **regex 修复**：`(?:\s|$)` → `(?::|\s|$)` 兼容中文（D#: 后跟中文）
- **Chat DELETE 路由**：补齐 `DELETE /api/chats/:id`，调用 chatRepo.delete

## 文件改动清单摘要

| 类别 | 文件数 | 关键文件 |
|------|--------|---------|
| 后端路由 | 1 | apps/api/src/router/chat.router.ts（DELETE 路由） |
| 后端 server | 1 | apps/api/src/server.ts（新增 /api/models） |
| 前端 client | 2 | apps/miniprogram/src/api/client.js + apps/web/src/api/client.ts（动态获取模型列表） |
| 脚本 | 1 | scripts/check-spec-binding.mjs（新建） |
| 注释 | 多 | apps/api/src/**/*.ts 补充 D1-D7 spec-binding 注释 |

## 风险点

| 风险 | 等级 | 缓解 |
|------|------|------|
| Spec-Binding regex 中文兼容性 | 低 | 已修复为 `(?::\|\s\|$)` |
| 前端硬编码 modelKeys 与 contracts 不同步 | 中 | R4 改为 API 获取 + local fallback |
| R4 无独立 PRD/Tech-Spec | 中 | 后续 R7-R10 重蹈此覆辙；R11/R12 通过规则升级修复 |

## 最近提交

- e6a5e60 @ feat: Phase A-D 优化完成 — 测试补齐 + Spec-Binding + 前端SSOT + 生产加固

## 快速链接

- 全量上下文: [context-snapshot.md](../context-snapshot.md)
- 上轮复盘: [round-3.md](retro/round-3.md)
- 本轮复盘: [round-4.md](retro/round-4.md)
- 教训索引: [lessons-learned.md](retro/lessons-learned.md)
- 工作流: [spec-first-workflow.md](workflow/spec-first-workflow.md)
- AI 手册: [AGENTS.md](../../AGENTS.md)
