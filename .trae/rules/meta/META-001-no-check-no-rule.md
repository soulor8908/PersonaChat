---
rule_id: META-001
title: 无校验不立规
severity: blocking
---

## 规则

每条规则（META 类自身除外）必须在"校验方式"段明确写清楚**可以被脚本或机器判断的条件**——不能只写"代码 review 时检查"。

## 触发条件

创建或修改 `.trae/rules/` 中任何非 `meta/` 子目录下的规则文件时。

## 期望行为

- "校验方式"段必须包含至少一个以下可机器校验的关键词：
  `check-rules.mjs`、`tsc`、`vitest`、`check-spec-binding`、`ci.yml`、`eslint`、`grep`、`Regex`、`结构检查`、`静态分析`
- 如果当前无法自动化校验，必须标注 `[advisory]` 并说明原因和自动化计划
- 禁止在"校验方式"段中仅写"代码 review 时检查"、"review 时手动核对"等无执行能力的主观描述

## 校验方式

`check-rules.mjs` 分支 `META-001` —— 扫描所有非 meta/ 子目录的规则文件，检查"校验方式"段是否包含至少一个可机器校验关键词或 `[advisory]` 标记。
