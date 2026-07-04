---
rule_id: CODE-004
title: 模块边界
severity: blocking
---

## 规则
每个文件只导出一个主要功能（类或函数集）。文件长度不超过 300 行。

## 触发条件
创建新文件或编辑现有文件时。

## 期望行为
- 文件长度超过 300 行时必须拆分
- 一个文件一个关注点
- 如果一个文件中有多个不相关的导出，拆分
- 工具函数归入 `lib/` 或 `domain/` 目录

## 校验方式
`check-rules.mjs` 分支 `CODE-004` —— 扫描 `apps/api/src/` 和 `packages/contracts/src/` 下所有 `.ts` 文件，检查行数是否超过 300。
