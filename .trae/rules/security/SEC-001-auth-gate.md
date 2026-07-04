---
rule_id: SEC-001
title: 路由默认受保护
severity: blocking
---

## 规则
所有 API 路由默认需要认证。公开路由必须在 router 中显式声明。

## 触发条件
创建新的 API 路由时。

## 期望行为
- 新路由默认需要 auth 中间件
- 公开路由（如 /api/health）需显式标记
- 不在前端存储 API key（敏感信息不入 Storage）

## 校验方式
`check-rules.mjs` 分支 `SEC-001` —— 扫描 `apps/api/src/router/` 下所有 Hono 路由声明（`router.get/post/put/delete`），检查是否存在无 auth 中间件的路由且未标注 `[public]`。当前项目无鉴权层，此项为 `[advisory]` 模式（警告不阻断）。
