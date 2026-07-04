---
rule_id: AI-004
title: 每次改动必跑三件套
severity: blocking
---

## 规则
每次代码改动后，必须顺序执行：typecheck → lint → test。任一失败即停。

## 触发条件
完成任何代码文件的修改后。

## 期望行为
1. 运行 `npx tsc --noEmit`（typecheck）
2. 运行 lint 检查
3. 运行 `vitest run`
4. 全部通过后再提交

## 校验方式
CI workflow (ci.yml) 中自动执行三件套（typecheck + lint + vitest），任一失败阻断合入。
