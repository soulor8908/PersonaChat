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
[advisory] 无直接脚本校验（需语义理解 Spec 内容）。Reviewer 逐方法核对实现是否偏离 Spec 定义。重构 PR 必须附带回溯 Spec。
