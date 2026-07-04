---
rule_id: CODE-002
title: 禁止吞错误
severity: blocking
---

## 规则
catch 块中禁止空的或只 console.error 的处理。每个 catch 必须有实际的错误传播或恢复逻辑。

## 触发条件
当编写 try-catch 或 .catch() 时。

## 期望行为
- 前端 catch：必须给用户反馈（wx.showToast/提示）
- 后端 catch：必须通过 AppError 抛出或返回错误响应
- 禁止空的 catch {} 块
- 禁止只 console.error 而不做任何处理

## 校验方式
`check-rules.mjs` 分支 `CODE-002` —— 扫描所有 `.ts/.js` 源码，检测空 `catch {}` 和仅含 `console.error`/`console.log` 的 catch 块。
