---
rule_id: AI-005
title: 禁止硬编码跨域可变集合，用 SSOT 派生断言
severity: blocking
---

## 规则

禁止在业务代码中手动维护"可选值集合"（如模型 ID 列表、分类枚举列表、状态机转换表）。这些集合必须从 Zod 枚举/原生枚举中通过 `schema.options` 或 `enumValues` 派生，或作为 contracts SSOT 的 `as const` 数组定义。

## 触发条件

当代码中出现了 `includes`、`.find()`、`.filter()`、`switch` 等逻辑，其判断对象是一个可以在 contracts 中定义的可变集合时。

## 期望行为

- contracts 中定义 `as const` 数组或 Zod enum，如 `builtinModelIds` 或 `personaCategorySchema`
- 业务代码通过 `[...builtinModelIds]` 或 `personaCategorySchema.options` 派生迭代/查找逻辑
- 禁止在 domain/service/router 层手写 `['model-a', 'model-b']` 这样的硬编码数组
- 新增一个选项值时只需改 contracts 一处

## 反例

```typescript
// ❌ 硬编码：contracts 改一处，这里忘了改
const MODEL_REGISTRY: Record<string, ...> = {
  'deepseek-v3': { ... },
  'glm-4-flash': { ... },
  'gpt-4o-mini': { ... },
}

// ❌ 条件分支用硬编码字符串
if (model === 'glm-4-flash') { ... }
```

## 正例

```typescript
// ✅ 集合从 contracts 派生
// contracts 中: export const builtinModelIds = ['deepseek-v3', ...] as const
// 业务代码:
import { builtinModelIds, builtinModelIdSchema } from '@personachat/contracts'
const id = builtinModelIdSchema.parse(userInput)
if (builtinModelIds.includes(id)) { ... }
```

## 校验方式

`check-rules.mjs` 分支 `AI-005` —— 扫描 `apps/api/src/` 下所有 `.ts` 文件，检查是否存在包含 2+ 个字符串元素的数组字面量，其元素值也在 contracts 中有定义。警告模式，需 Reviewer 确认。
