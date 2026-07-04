---
rule_id: CODE-001
title: 禁止 any
severity: blocking
---

## 规则
TypeScript 代码中禁止使用 `any` 类型。必须使用明确的类型或 `unknown`。

## 触发条件
当代码中出现 `any` 关键字时。

## 期望行为
- 使用具体的类型定义
- 不确定类型时使用 `unknown` + 类型断言/守卫
- 从 Zod schema 通过 `z.infer` 派生类型

## 校验方式
`tsc --noEmit` 的 strict 模式会捕获隐式 any；review 时 grep 检查 `: any`。
