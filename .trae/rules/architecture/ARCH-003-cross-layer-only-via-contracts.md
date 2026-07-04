---
rule_id: ARCH-003
title: 跨层通信只经契约
severity: blocking
---

## 规则
前后端之间的数据交换必须使用 `packages/contracts` 中定义的 Schema 类型。

## 触发条件
当前端调用后端 API 或后端返回数据给前端时。

## 期望行为
- API 请求/响应体必须使用 contracts 导出的 Zod schema 做校验
- 禁止在 router 层直接手写 `c.json({...})` 而不经过 schema 验证
- 前端 API 客户端函数的参数/返回值类型必须从 contracts 派生

## 校验方式
`check-rules.mjs` 分支 `ARCH-003` —— 扫描 `apps/miniprogram/` 下所有源码，检查是否存在 `import ... from` 引用 `apps/api/` 或 `packages/` 下非 contracts 模块。
