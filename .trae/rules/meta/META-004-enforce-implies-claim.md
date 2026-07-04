---
rule_id: META-004
title: 实现即声明
severity: blocking
---

## 规则

`scripts/check-rules.mjs` 中存在 `// === RULE_ID ===` enforcement 分支的每条规则，**必须**有对应的 `.trae/rules/` 下的规则文档。禁止存在"幽灵 enforcement"（脚本中有校验但无对应规则文档）。

## 触发条件

`check-rules.mjs` CI 运行时自动触发。

## 期望行为

- 从 `scripts/check-rules.mjs` 源码中提取所有 `// === RULE_ID ===` 分支的规则 ID 列表
- 验证每个 ID 在 `.trae/rules/` 下存在对应的 `.md` 文件（文件名包含 `RULE_ID`）
- 脚本有分支但无对应规则文档 → **error**（阻断）：`META-004: enforcement branch {id} has no matching rule file`

## 校验方式

`check-rules.mjs` 分支 `META-004` —— 遍历 check-rules.mjs 中所有 `// === RULE_ID ===` 注释块，检查是否存在对应规则文档。
