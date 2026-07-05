# Phase A: 测试补齐 — 实施计划

> Superpowers Phase 3: Planning | 2026-07-05

## Task Breakdown (每个 2-5 分钟)

### T1: 搭建 E2E 测试基础设施
- 创建 `apps/api/test/helpers.ts` — 导出 `createTestApp()` 工厂
- 用 Miniflare D1 simulator 构造 in-memory DB
- 验证: helpers.ts 可正常导入

### T2: persona CRUD E2E — 创建 (P1, P5, P6, P12)
- `apps/api/test/persona.e2e.test.ts` — POST 正常 + 边界 + 错误
- 验证: `pnpm test -- persona.e2e` 4 tests

### T3: persona CRUD E2E — 读取 (P2, P9)
- GET /:id 正常 + 不存在
- 验证: 6 tests total

### T4: persona CRUD E2E — 更新 + 删除 (P3, P4, P7, P8, P10, P11)
- PUT/DELETE 正常 + 边界 + 错误
- 验证: 12 tests total, persona CRUD E2E 完成

### T5: chat service 单元测试 (C1-C6)
- `apps/api/test/chat-svc.test.ts` — mock repo + callLLM
- 验证: 18 tests total (12 E2E + 6 unit)

### T6: chat router E2E (R1-R6)
- `apps/api/test/chat.e2e.test.ts` — POST /api/chat 全路径
- 验证: 24 tests total (12 + 6 + 6)

### T7: 跑全量 trinity + 生成报告
- `pnpm trinity` 全绿
- 更新测试覆盖率统计
- 验证 AI-007 E2E 覆盖状态
