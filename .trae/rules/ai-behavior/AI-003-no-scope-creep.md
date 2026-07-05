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

`check-rules.mjs` 分支 `AI-003` — 越界检测门禁：通过 `git diff` 检测本次改动的功能源码文件，与本次改动的 Tech-Spec 中"## 变更清单"表格声明的文件列表（`| path/file.ts | 变更 | 说明 |` 格式）做交叉匹配。源码文件的 basename 必须在某个 Tech-Spec 变更清单中出现，否则视为越界 → **error**（阻断）。Tech-Spec 无变更清单表格时降级为 advisory（不阻断）。Reviewer 仍需逐功能点核对 Spec 范围。
