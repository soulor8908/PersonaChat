---
rule_id: FRONTEND-001
title: 前端可变配置从 API 获取
severity: advisory
---

## 规则

前端的所有可变配置集合（模型列表、分类列表等）必须从后端 API 动态获取，禁止在前端代码中硬编码。服务不可达时使用 local fallback，但 fallback 应明确标注为"兜底值"且保持最小化。

## 触发条件

在小程序前端代码中出现硬编码数组字面量，其值与 contracts 或后端 API 返回的数据重叠时。

## 期望行为

- 前端通过 `GET /api/{resource}` 动态获取配置数据
- 硬编码 fallback 只用于"API 不可达"场景
- fallback 数据标注注释 `// fallback — API unreachable`
- 新增后端配置项时前端自动感知（无需手动同步）

## 校验方式

`check-rules.mjs` 不直接校验（前端为 .js 文件，非 TS 编译期）。Reviewer 逐文件核对前端无硬编码集合。
