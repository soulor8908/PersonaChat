# Round 2 复盘 — 代码优化 Phase 1-4

## AC 完成率: 4/4 | 测试覆盖: 22/22 | Blocker: 0 | 结论: 通过

## 教训

- **教训**: AI-005 check-rules 的 hardcoded string array 检测未发现 MODEL_REGISTRY（因为它是 Record 字面量而非数组字面量）。check-rules.mjs 的 AI-005 分支只扫 `as const` 数组，应扩展到 Record 字面量检测。
- **教训**: contracts 已经定义了 `builtinModelIds` 和 `modelConfigSchema`，但 domain/llm.ts 完全无视它们，自建了一套 MODEL_REGISTRY。这暴露了 META-004 的价值——如果 Spec-Binding 在 Phase 0 就投入运转，AI-005 违规会被 Dx 漂移自动发现。
- **教训**: TypeScript 的 `as any` 是类型安全的头号敌人。llm.ts 有 3 处 `as any`，用 Zod schema parse 替换后，编译器和运行时双重保护。
- **教训**: `Math.random()` 用于 ID 生成不安全。CF Workers 环境原生支持 `crypto.randomUUID()`，无需引入额外依赖。

## 反推

- **规则**: AI-005 enforcement 需增强 Record 字面量检测
- **提示词**: impl-writer 应明确"禁止 `as any`，一律用 Zod schema parse"
- **模板**: Tech-Spec 应明确标注 SSOT 派生路径（contracts → domain → service）
