# Round 3 复盘 — Superpowers TDD + Spec-Binding

## AC 完成率: 3/3 | 测试: 22→48 | Blocker: 0 | 结论: 通过

## 教训

- **教训**: Mock D1 数据库的 UPDATE handler 出现了 params offset 错误——SET 子句和 WHERE 子句的参数索引混在一起，导致更新不生效。测试工具本身应该有测试。
- **教训**: Rate-limit 中间件的全局 Map 在 E2E 测试间累积请求计数，导致 chat E2E 测试命中限流而返回 401。状态中间件不应该影响 E2E 测试——应 mock 或跳过。
- **教训**: `updated!` 非空断言是 CODE-001 精神上的违规。用 `if (!updated) throw Errors.internal(...)` 替代，编译器真正保护而非假安全。

## 反推

- **规则**: 建议增加 TEST-001 规则"E2E 测试应 mock 有状态中间件"
- **提示词**: test-writer 应明确"E2E 测试使用最小 app 实例，绕过 auth/rate-limit"
- **模板**: 测试 helpers 应有自己的单元测试覆盖
