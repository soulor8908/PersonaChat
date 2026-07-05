# Lessons Learned — 教训索引
> 生成日期: 2026-07-05 | 总教训: 16 | 覆盖轮次: 6

## 轮次对比

| 轮次 | AC 完成率 | 测试覆盖 | Blocker | 结论 |
|------|-----------|----------|---------|------|
| Round 1 | ? | ? | ✓ 0 | ? |
| Round 2 | 4/4 | ? | ✓ 0 | 通过 |
| Round 3 | 3/3 | ? | ✓ 0 | 通过 |
| Round 4 | 2/2 | 48/48 | ✓ 0 | 通过 |
| Round 5 | 2/2 | 48/48 | ✓ 0 | 通过 |
| Round 6 | 1/1 | 48/48 | ✓ 0 | 通过 |

## Spec

- (Round 2) **教训**: contracts 已经定义了 `builtinModelIds` 和 `modelConfigSchema`，但 domain/llm.ts 完全无视它们，自建了一套 MODEL_REGISTRY。这暴露了 META-004 的价值——如果 Spec-Binding 在 Phase 0 就投入运转，AI-005 违规会被 Dx 漂移自动发现。
- (Round 4) **教训**: Spec-Binding 从 0→7 决策是质的飞跃，但 `D#:` 注释格式与 regex 的 `(?:\s|$)` 不兼容——冒号后面直接跟中文导致 regex 无法匹配。修正为 `(?::|\s|$)` 解决。
- (Round 6) **教训**: Spec-Binding D8 漂移（代码引用 D8 但 Spec 无此决策）是"幽灵引用"的典型案例——写代码时顺手标注了 D8，但 Spec 没同步更新。解决：在 Spec 中补充 D8 决策。

## 测试

- (Round 3) **教训**: Mock D1 数据库的 UPDATE handler 出现了 params offset 错误——SET 子句和 WHERE 子句的参数索引混在一起，导致更新不生效。测试工具本身应该有测试。
- (Round 3) **教训**: Rate-limit 中间件的全局 Map 在 E2E 测试间累积请求计数，导致 chat E2E 测试命中限流而返回 401。状态中间件不应该影响 E2E 测试——应 mock 或跳过。

## 规则

- (Round 1) 规则定义时"校验方式"段要写可脚本化检查的条件，避免纯主观 review
- (Round 2) **教训**: AI-005 check-rules 的 hardcoded string array 检测未发现 MODEL_REGISTRY（因为它是 Record 字面量而非数组字面量）。check-rules.mjs 的 AI-005 分支只扫 `as const` 数组，应扩展到 Record 字面量检测。

## 实现

- (Round 1) 小程序前端不能直接 import workspace 包，需通过类型声明文件间接享用类型安全
- (Round 3) **教训**: `updated!` 非空断言是 CODE-001 精神上的违规。用 `if (!updated) throw Errors.internal(...)` 替代，编译器真正保护而非假安全。

## 其他

- (Round 1) 四层架构在初期会增加文件数量但降低每文件复杂度——长期收益远大于短期成本
- (Round 2) **教训**: TypeScript 的 `as any` 是类型安全的头号敌人。llm.ts 有 3 处 `as any`，用 Zod schema parse 替换后，编译器和运行时双重保护。
- (Round 2) **教训**: `Math.random()` 用于 ID 生成不安全。CF Workers 环境原生支持 `crypto.randomUUID()`，无需引入额外依赖。
- (Round 4) **教训**: 前端 `modelKeys: ['deepseek-v3', ...]` 硬编码与 contracts 不同步——后端增删模型前端不会自动感知。解决方案是 `GET /api/models` 从 SSOT 下发，前端 API 动态获取 + local fallback。
- (Round 5) **教训**: 前端优化时发现 history 页一次性加载全部记录，缺少分页和删除功能。增加下拉刷新 + 触底加载后用户体验明显改善。
- (Round 5) **教训**: 客户端 API 方法（`ChatApi.deleteRecord`）应该与后端路由同步扩展——加了后端端点后前端容易遗漏。
- (Round 6) **教训**: 复盘反推机制在快节奏开发中被忽略——6 个 round 只有 Round 1 的复盘是正式写入的。应该每轮结束后立即复盘，而不是攒到最后补。

## 趋势

| 指标 | 前半程 | 后半程 |
|------|--------|--------|
| 轮次数 | 3 | 3 |
| 累计 Blocker | 0 | 0 |
| 平均教训/轮 | 3.3 | 2.0 |

---

*自动生成，不要手动编辑。复盘后运行 `pnpm retro` 更新。*