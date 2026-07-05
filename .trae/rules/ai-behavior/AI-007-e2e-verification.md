---
rule_id: AI-007
title: 端到端验收 + PRD 逐条核对
severity: blocking
---

## 规则

每条 PRD 中的验收标准（Given/When/Then）必须有对应的端到端测试覆盖。禁止实现完成后跳过 E2E 验证直接合入。

## 触发条件

实现阶段完成后，合入前触发。

## 期望行为

1. PRD 中每条 Given/When/Then 都必须有对应的测试断言
2. 测试按场景组织（正常路径 / 边界条件 / 错误路径）
3. 端到端测试覆盖完整用户流程（API → 数据库 → 响应）
4. 测试文件命名：`{feature}.e2e.test.ts`
5. CI 中 E2E 测试作为独立 job 运行

## 覆盖率检查清单

```
Given 用户输入合法 → When 发起请求 → Then 返回 200 + 正确数据
Given 用户输入非法 → When 发起请求 → Then 返回 400 + 错误码
Given 资源不存在   → When 发起请求 → Then 返回 404
Given 系统异常     → When 发起请求 → Then 返回 500 + 不泄露内部信息
Given 并发请求     → When 同时发起  → Then 数据一致性保持
```

## 反例

```typescript
// ❌ 只测了 happy path，PRD 中的错误处理和边界条件一个没测
test('should create persona', async () => {
  const res = await appRequest('/api/personas', { method: 'POST', ... })
  expect(res.status).toBe(200)
})
```

## 正例

```typescript
// ✅ E2E 测试按 PRD 的 Given/When/Then 组织，覆盖正常/边界/错误三种路径
describe('POST /api/personas', () => {
  test('GIVEN valid input WHEN create THEN return 201 + persona', async () => { ... })
  test('GIVEN missing name WHEN create THEN return 400 + VALIDATION_ERROR', async () => { ... })
  test('GIVEN duplicate name WHEN create THEN return 409', async () => { ... })
  test('GIVEN DB unavailable WHEN create THEN return 500', async () => { ... })
})
```

## 校验方式

`check-rules.mjs` 分支 `AI-007` — E2E 验收门禁：通过 `git diff` 检测本次改动的 PRD 文件，若 `docs/prd/*.md` 发生改动但无 `.test.ts` / `.e2e.test.ts` 同步改动 → **error**（阻断）。同时统计 PRD 中 `Given` 子句数量作为粗粒度 AC 计数提示。Reviewer 仍需逐条核对 PRD 验收标准与测试用例覆盖率（正常/边界/错误三类路径是否完整）。`vitest` CI job 自动运行 E2E 测试。
