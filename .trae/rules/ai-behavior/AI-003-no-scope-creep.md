---
rule_id: AI-003
title: 禁止越界发挥
severity: blocking
---

## 规则
AI 只实现 Spec 中定义的功能点。不得添加 Spec 之外的"我觉得这样更好"的额外功能。

## 触发条件
当 AI 在实现过程中产生了"顺便加个小功能"的念头时。

## 期望行为
1. 严格按照 Spec 的功能点清单实现
2. 任何超出 Spec 范围的修改，必须先更新 Spec（经过审批）
3. 如果发现 Spec 遗漏，记录到"不确定项"而非自行补全

## 校验方式
[advisory] 比对 PR diff 与 Spec 功能点清单，检查是否存在 Spec 未覆盖的改动（需 git diff 上下文）。+ Reviewer 逐功能点核对。
