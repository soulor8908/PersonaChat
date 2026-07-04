---
rule_id: SEC-002
title: 密钥不入仓
severity: blocking
---

## 规则
API key、数据库密码、token 等敏感信息不得硬编码在代码中，也不得提交到版本控制。

## 触发条件
当代码中出现类似 `api_key`、`secret`、`password` 等字样的字符串字面量时。

## 期望行为
- 后端通过环境变量/CF Workers secrets 注入
- 前端用户输入的 API key 仅存本地，不提交
- `.env` 文件加入 `.gitignore`
- 代码中只引用环境变量的名称（如 `env.DEEPSEEK_API_KEY`）

## 校验方式
`check-rules.mjs` 分支 `SEC-002` —— `grep` 扫描 `apps/` 和 `packages/` 下所有源码，检测硬编码的 `api_key`、`apiKey`、`secret`、`password`、`token`、Bearer token 等凭据模式字符串。
