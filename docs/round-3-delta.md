# R3 增量上下文
> 2026-07-05 | from: round-2

## 本轮目标

1. **Persona CRUD 接口补齐** — POST/PUT/DELETE 路由 + Zod 入口校验（复用 R2 PRD AC，Tech-Spec 由 `docs/spec/persona-crud.tech.md` D1-D8 覆盖）
2. **修复 R2 遗留质量问题** — `MODEL_REGISTRY` 硬编码（AI-005 违规）/ 3 处 `as any`（CODE-001 违规）/ `Math.random()` ID 生成（SEC 精神违规）
3. **引入 Superpowers TDD 雏形** — 测试先行（红→绿）流程
4. **引入 Spec-Binding 注释雏形** — `D#:` 注释格式（R4 修正 regex 中文兼容性）

## 本轮约束

| 规则 | 要求 |
|------|------|
| AI-001 | 先读 Spec 再写码 |
| AI-002 | 测试先行 |
| AI-004 | 每次改动跑 trinity |
| AI-007 | E2E 覆盖 PRD 验收标准 |

> 全量规则见 `pnpm check` 或 `.trae/rules/`

## 变更文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/contracts/src/schemas/persona.ts` | 修改 | personaCreateSchema / personaUpdateSchema / personaIdSchema (D1/D2/D3/D7) |
| `apps/api/src/repository/persona-repo.ts` | 修改 | create/update/delete 方法 + 参数化 SQL (D4/D5/D8) |
| `apps/api/src/service/persona-svc.ts` | 修改 | 编排层 Zod parse → repo → 错误码映射 (D6) |
| `apps/api/src/router/persona.router.ts` | 修改 | POST/PUT/DELETE 路由 + 入口校验 (D7) |
| `apps/api/src/domain/llm.ts` | 修改 | 修复 MODEL_REGISTRY/as any/Math.random (AI-005/CODE-001/SEC) |
| `apps/api/test/persona.e2e.test.ts` | 修改 | 新增 13 个 CRUD E2E 用例 (P1-P12) |
| `apps/api/test/persona-parser.test.ts` | 修改 | 新增 9 个 parser 边界用例 |
| `apps/api/test/chat-svc.test.ts` | 新增 | chat service 单元测试 (mock D1 + callLLM) |

## 最近提交

> R2/R3 早期提交已合入后续主干；当前仓库可见提交均为回溯补齐的文档提交。
- ee152ce docs: 补齐 R1-R10 历史文档缺口 + 更新 context-snapshot 到 R12
- e3d4114 docs: PRD G1 合规修正 + 文档索引 + context-snapshot 更新

## 快速链接

- 全量上下文: [context-snapshot.md](../context-snapshot.md)
- 上轮复盘: [round-2.md](round-2.md)
- 教训索引: [lessons-learned.md](lessons-learned.md)
- 工作流: [spec-first-workflow.md](../workflow/spec-first-workflow.md)
- AI 手册: [AGENTS.md](../../AGENTS.md)
