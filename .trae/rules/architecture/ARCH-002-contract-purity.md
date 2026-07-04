---
rule_id: ARCH-002
title: 契约层纯净
severity: blocking
---

## 规则
`packages/contracts/` 只导出 Zod schema 和 TS 类型，不能引入业务逻辑。

## 触发条件
当向 contracts 包中添加代码时。

## 期望行为
- contracts 只依赖 `zod`
- 不引入 hono、fetch、数据库等运行时依赖
- 不包含业务逻辑、工具函数
- 所有 schema 使用 `z.infer` 导出类型

## 校验方式
`check-rules.mjs` 分支 `ARCH-002` —— 检查 contracts/package.json 的 dependencies 仅含 zod/typescript/vitest。
