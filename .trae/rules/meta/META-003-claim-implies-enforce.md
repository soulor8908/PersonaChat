---
rule_id: META-003
title: 声明即实现
severity: blocking
---

## 规则

规则文档的"校验方式"段如果声称通过 `check-rules.mjs` 校验，则 `scripts/check-rules.mjs` 中**必须**存在对应的 `// === RULE_ID ===` 分支。

## 触发条件

`check-rules.mjs` CI 运行时自动触发。

## 期望行为

- 从所有规则文档的"校验方式"段中提取声称使用 `check-rules.mjs` 的规则 ID 列表
- 从 `scripts/check-rules.mjs` 源码中提取所有 `// === RULE_ID ===` 分支的规则 ID 列表
- 声称使用但脚本中无对应分支 → **error**（阻断）：`META-003: rule {id} claims check-rules.mjs but no enforcement branch found`

## 校验方式

`check-rules.mjs` 分支 `META-003` —— 双向匹配：规则文档声称 check-rules.mjs → 脚本必须有分支；脚本有分支 → 规则文档必须有对应规则（META-004）。
