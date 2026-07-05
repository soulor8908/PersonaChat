---
rule_id: AI-001
title: 先读 Spec 再写码
severity: blocking
---

## 规则
在写任何代码之前，必须先读取对应功能的 PRD-Spec 和 Tech-Spec（位于 docs/prd/ 和 docs/spec/ 下）。

重构或大规模修改（超过 50 行代码或结构变更）前，还需先创建"回溯 Spec"记录当前行为：
1. 创建 `docs/spec/backrefactor-<feature>.md`
2. 记录被修改模块的当前行为、接口、依赖
3. 定义"重构完成"的验收标准（测试全部通过 + 行为不变）
4. 重构过程中每一步都要通过测试验证

## 触发条件
当 AI 被要求实现某个功能或修改某段代码时。

## 期望行为
1. 定位 docs/prd/ 或 docs/spec/ 下对应的 Spec 文件
2. 如果没有找到 Spec，必须拒绝编码，请求先补充 Spec
3. 理解 Spec 中的验收标准、边界条件和状态机后再开始实现

## 校验方式

`check-rules.mjs` 分支 `AI-001` — Spec-First 门禁：通过 `git diff` 检测本次改动文件，若 `apps/api/src/{domain,repository,service,router}/`、`packages/contracts/src/schemas/`、`apps/web/src/pages/`、`apps/miniprogram/pages/` 下的功能源码发生改动但 `docs/prd/*.md` 和 `docs/spec/*.tech.md` 均未同步改动 → **error**（阻断）。重构例外：若同步改动了 `docs/spec/backrefactor-*.md`（回溯 Spec）则放行。CI 场景使用 `BASE_REF` 环境变量指定 PR base ref；本地场景使用 `git diff HEAD` + 未追踪文件。Reviewer 仍需逐方法核对实现是否偏离 Spec 定义。
