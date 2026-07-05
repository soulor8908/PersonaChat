# Persona CRUD — Tech Spec

> Tech Lead | 2026-07-05 | 基于 PRD R3-persona-crud

## 架构决策

### D1: 输入 Schema 与实体 Schema 分离
**方案**: personaCreateSchema / personaUpdateSchema 独立于 personaSchema
**理由**: 实体包含 id/createdAt/updatedAt/stargazersCount 等系统生成字段，不应暴露给客户端输入
**被拒绝方案**: 复用 personaSchema 并标记部分字段 optional — 语义不清晰，容易误用

### D2: create 不包含 stargazersCount
**方案**: stargazersCount 默认 0，不通过 API 传入
**理由**: stargazersCount 由 sync 管道同步 GitHub stars，手动创建应固定为 0
**被拒绝方案**: 允许传入 stargazersCount — 破坏数据一致性

### D3: update 全部字段可选，至少一个
**方案**: personaUpdateSchema 使用 .refine() 确保至少一个字段
**理由**: 部分更新语义，客户端只需传要改的字段
**被拒绝方案**: 全部字段必填（PUT 语义）— 增加客户端负担

### D4: Repository 层使用参数化 D1 绑定
**方案**: 所有 SQL 通过 db.prepare(sql).bind(...params) 执行
**理由**: 防止 SQL 注入，D1 不推荐字符串拼接（SEC-003）
**被拒绝方案**: 字符串拼接 SQL — 安全风险

### D5: create/update/delete 独立原子操作
**方案**: 每个操作一个 repo 方法（create/update/delete），不重用 upsert
**理由**: upsert 用于 sync 场景（INSERT OR UPDATE），create/update 语义不同
**被拒绝方案**: 统一使用 upsert — create 重复调用会覆盖已有数据

### D6: 业务层只编排，不做数据库操作
**方案**: service 层调用 repo 方法，不直接构造 SQL
**理由**: ARCH-001 依赖方向要求 service → repo，数据库访问封装在 repo
**被拒绝方案**: service 直接操作 D1 — 违反分层架构

### D7: 所有路由入口 Zod 校验
**方案**: router 层使用 contracts 导出的 Zod schema 做 .parse() 校验
**理由**: 输入校验在路由层完成，下层可信任数据（SEC-003）
**被拒绝方案**: 用 TypeScript 类型断言跳过校验 — 不安全

### D8: Repository 的 delete 操作先查存在性再删除
**方案**: delete 方法需先 find 再 delete，不存在则抛 NOT_FOUND
**理由**: 与其他 CRUD 语义一致，给客户端明确的 404 反馈
**被拒绝方案**: 直接 delete 不查存在性 — 无法区分"成功删除"和"本来就不存在"

| 文件 | 变更 | 说明 |
|------|------|------|
| `packages/contracts/src/schemas/persona.ts` | 新增 personaCreateSchema | D2 |
| `packages/contracts/src/schemas/persona.ts` | 新增 personaUpdateSchema | D3 |

## 错误码

| 错误码 | 场景 |
|--------|------|
| 1001 (NOT_FOUND) | Persona 不存在 |
| 1002 (VALIDATION_ERROR) | 输入校验失败、重复创建 |
| 5000 (INTERNAL_ERROR) | 数据库错误 |

## 测试策略

| 测试类型 | 文件 | 覆盖 |
|----------|------|------|
| Schema 单元测试 | `packages/contracts/test/persona.test.ts` | 已有 |
| E2E 端到端 | `apps/api/test/persona.e2e.test.ts` | 13 个 Given/When/Then |
| AI-007 验收 | 覆盖 P1-P12 全部 AC | 正常/边界/错误三类路径 |
