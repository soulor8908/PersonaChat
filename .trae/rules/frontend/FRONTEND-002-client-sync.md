---
rule_id: FRONTEND-002
title: 前端 API Client 与后端契约保持同步
severity: advisory
---

## 规则

小程序前端 `src/api/client.js` 中的 API 方法必须与后端路由一一对应。新增后端端点时，必须同步更新前端 client。

## 触发条件

当后端新增、修改或删除 API 端点时。

## 期望行为

- 每个后端路由端点在前端 client 中有对应方法
- 方法签名与后端契约一致（参数名、路径、方法）
- 使用 `ChatApi.getModels()` / `ChatApi.deleteRecord(id)` 等语义化命名

## 校验方式

[advisory] 前端代码为 .js 文件，非 TS 编译期校验。Reviewer 核对 `apps/api/src/router/*.ts` 与 `apps/miniprogram/src/api/client.js` 的端点一致性。
