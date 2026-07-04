---
rule_id: ARCH-001
title: 单向依赖方向
severity: blocking
---

## 规则
后端四层的依赖方向必须为单向向下：
`router → service → repository → domain`

禁止反向依赖，禁止跨层调用。

## 触发条件
当创建新的模块或修改现有模块时。

## 期望行为
- router 只能调用 service
- service 只能调用 repository 和 domain
- repository 只能调用 domain
- domain 为纯函数层，不依赖任何其他层
- domain 层禁止引入 hono、数据库等基础设施依赖

## 校验方式
`check-rules.mjs` 分支 `ARCH-001` —— 扫描 import 路径，检查四层依赖方向是否合规。
