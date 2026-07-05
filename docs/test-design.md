# Phase A: 测试补齐 — 设计文档

> Superpowers Phase 2: Design | 2026-07-05

## 一、目标

从 22 个单元测试（仅 contracts + persona-parser）扩展到 50+ 测试，新增 E2E 覆盖 persona CRUD 和 chat 路由的全部业务路径。

## 二、测试文件规划

| 文件 | 类型 | 覆盖范围 | 预计用例 |
|------|------|----------|----------|
| `apps/api/test/persona.e2e.test.ts` | E2E | persona CRUD 全路径 | 12 |
| `apps/api/test/chat-svc.test.ts` | 单元 | chat service 业务逻辑 | 6 |
| `apps/api/test/chat.e2e.test.ts` | E2E | chat 路由端到端 | 6 |
| **新增合计** | | | **24** |
| `packages/contracts/test/persona.test.ts` | 已有 | contracts schema | 6 |
| `packages/contracts/test/chat.test.ts` | 已有 | contracts schema | 7 |
| `apps/api/test/persona-parser.test.ts` | 已有 | domain parser | 9 |
| **总计** | | | **46** |

## 三、E2E 测试架构

```
app.request('/api/personas', { method: 'POST', body: ... })
    │
    ▼
createApp(mockEnv)               ← Hono app 工厂
    │
    ├── router → service → repo → D1 (Miniflare simulator)
    │
    └── middleware: auth (API_KEY 未设置时跳过) + rate-limit + error-handler
```

### Mock 策略

| 组件 | Mock 方式 | 原因 |
|------|----------|------|
| D1 Database | Miniflare D1 simulator (`createSQLiteDB`) | 真实 SQL 验证，不 mock 数据库 |
| LLM 调用 | `vi.mock('../src/domain/llm.js')` 或手动 stub | 不依赖外部 API |
| fetch (syncFromSource) | `vi.stubGlobal('fetch', ...)` | 不依赖 GitHub API |
| API_KEY | 不设置（开发模式跳过 auth） | E2E 应测试鉴权后行为 |

### D1 Schema（自动建表）

```sql
-- ensureTables() 在 fetch() 入口自动执行
-- E2E 中通过 app.request() 触发
-- 每次测试前 TRUNCATE 清空数据
```

## 四、persona CRUD E2E — 12 个 Given/When/Then

### 正常路径（4 个）

| # | Given | When | Then |
|---|-------|------|------|
| P1 | 有效输入 | POST /api/personas | 201 + 返回 persona（含 id/timestamps） |
| P2 | 已存在 persona | GET /api/personas/:id | 200 + 返回正确 persona |
| P3 | 已存在 persona | PUT /api/personas/:id (valid) | 200 + 返回更新后 persona |
| P4 | 已存在 persona | DELETE /api/personas/:id | 200 + ok:true |

### 边界条件（4 个）

| # | Given | When | Then |
|---|-------|------|------|
| P5 | - | POST 空 body | 400 + Validation error |
| P6 | - | POST 缺少 name | 400 + Validation error |
| P7 | - | PUT 空 body | 400 + "至少提供一个字段" |
| P8 | - | PUT 不存在的 id | 404 + Persona not found |

### 错误路径（4 个）

| # | Given | When | Then |
|---|-------|------|------|
| P9 | - | GET /api/personas/不存在的id | 404 + Persona not found |
| P10 | - | DELETE 不存在的id | 404 + Persona not found |
| P11 | - | PUT 超长 name (>100) | 400 + Validation error |
| P12 | - | POST 超长 systemPrompt (>8000) | 400 + Validation error |

## 五、chat service 单元测试 — 6 个

利用 mock PersonaRepository / ChatRepository + mock callLLM：

| # | Given | When | Then |
|---|-------|------|------|
| C1 | persona 存在 | chat(personaId, messages, model) | 返回 reply + model |
| C2 | persona 不存在 | chat(nonExistentId, ...) | throw AppError NOT_FOUND |
| C3 | model 无 API key | chat(..., 'gpt-4o-mini') | throw AppError UNAUTHORIZED |
| C4 | 正常调用 | chat(...) | 异步保存聊天记录 |
| C5 | 传了 userApiKey | chat(..., apiKey='sk-xxx') | 用 userApiKey 调用 |
| C6 | LLM 返回错误 | callLLM 抛出 | throw AppError LLM_API_ERROR |

## 六、chat router E2E — 6 个

| # | Given | When | Then |
|---|-------|------|------|
| R1 | 有效请求 | POST /api/chat (mock persona) | 200 + reply + model |
| R2 | 缺失 messages | POST /api/chat (no messages) | 400 + Validation error |
| R3 | 缺失 personaId | POST /api/chat (no personaId) | 400 + Validation error |
| R4 | 不存在的 persona | POST /api/chat (bad personaId) | 404 |
| R5 | 默认模型 | POST /api/chat (no model) | 200 + 用默认模型 |
| R6 | 无效模型 ID | POST /api/chat (bad model) | 400 + Validation error |

## 七、验收标准

- [ ] 24 个新增测试全部通过
- [ ] E2E 测试不依赖外部网络
- [ ] `pnpm test` 总用例从 22 → 46
- [ ] check-rules.mjs 15/15 阻断仍全部通过
- [ ] AI-007: E2E 覆盖 PRD 验收标准（persona-crud 域）
