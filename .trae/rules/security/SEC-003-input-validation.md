---
rule_id: SEC-003
title: 输入校验
severity: blocking
---

## 规则
所有外部输入必须在 router 层通过 Zod schema 校验后方可传入下层。

## 触发条件
当处理用户输入、查询参数、请求体时。

## 期望行为
- 路由层使用 contracts 导出的 Zod schema 做 `.parse()` 校验
- 不信任 `c.req.query()` 的原始值——必须经过 schema
- 数据库查询使用参数化绑定（D1 prepare + bind），禁止字符串拼接

## 校验方式
`check-rules.mjs` 分支 `SEC-003` —— 检查所有 Hono 路由处理函数（`router.get/post/put/delete` 回调）中是否存在 `c.req.query()` 或 `c.req.json()` 直接使用而未经过 Zod schema `.parse()/.safeParse()` 的情况。+ Reviewer 逐函数核对数据库查询是否参数化绑定。
