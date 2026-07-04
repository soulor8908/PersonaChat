---
rule_id: META-002
title: 规则 PR 准入
severity: blocking
---

## 规则

修改 `.trae/rules/` 中任何规则文件时，必须同步审查并更新 `scripts/check-rules.mjs` 中对应的 enforcement 分支。

## 触发条件

提交涉及 `.trae/rules/` 目录下 `.md` 文件变更的 PR 时。

## 期望行为

- 新增规则 → `check-rules.mjs` 必须新增对应的 `// === RULE_ID ===` 分支
- 修改规则 → 检查 `check-rules.mjs` 对应分支是否需要同步修改
- 删除规则 → `check-rules.mjs` 中对应分支同步删除
- 变更 `severity` 字段 → `check-rules.mjs` 中对应 exit code 行为同步变更

## 校验方式

通过 META-003（声明即实现）间接校验。无 META-002 的直接静态校验（需 git diff 上下文），由 Reviewer 在 PR review 时根据 META-003/004 的结果辅助判断。
