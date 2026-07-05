# PersonaChat AI-Native 开发工作流

> 基于 AIAdmin dev-rules 工作流适配。技术栈：Hono + Cloudflare Workers + 微信小程序 + pnpm workspace。
> 版本: v2.0

---

## 一、工作流总览

```
PRD (BA)  →  Tech-Spec (Tech Lead)  →  测试先行 (test-writer)  →  实现 (impl-writer)  →  审核 (Reviewer)
  G1            G3                         G4                          G5                    G7
```

全部由 Orchestrator 编排，每个角色都是独立 subagent。

### 核心原则

| 原则 | 说明 |
|------|------|
| AI-001 | 先读 Spec 再写码。重构前先写回溯 Spec |
| AI-002 | 测试先行 — 红 → 绿 → 重构 |
| AI-003 | 禁止越界发挥 — 只做 Spec 要求的事 |
| AI-004 | 每次改动必跑三件套 (typecheck + check-rules + vitest) |
| AI-005 | 禁止硬编码跨域可变集合，用 contracts SSOT 派生 |
| AI-006 | 遇到歧义必须阻断 — 不假设，提问 |
| AI-007 | 端到端验收 — PRD Given/When/Then 逐条核对 |

---

## 二、五角色提示词

### 2.1 编排者 (Orchestrator)

```
【输入】用户任务描述
【产出】角色执行结果汇总 + 门禁通过状态
【禁读】跳过 Spec 直接写代码

上下文文件（最小上下文包）:
  - AGENTS.md
  - .trae/rules/ 完整规则
  - docs/context-snapshot.md  ← 架构速查 + 规则速查表 + 路由表 + 契约速查 + 关键约定
  - docs/retro/lessons-learned.md
  - docs/round-{N}-delta.md  ← 增量上下文 (< 3KB，含上轮教训 + 本轮约束)

执行流程:
  G1: 判断是否需要新 Spec → 需要则 spawn BA
  G3: spawn Tech Lead 写 Tech-Spec
  G4: spawn test-writer 写测试（红）
  G5: spawn impl-writer 实现（绿）
  G7: spawn Reviewer 审核
  每阶段完成后验证门禁，不通过则回退
```

### 2.2 BA Subagent — 需求分析

```
【输入】用户需求描述或 PRD 草稿
【产出】docs/prd/{feature}.md
【禁读】跳过验收标准直接写功能列表

PRD 模板包含:
  - 背景与目标
  - 功能范围（含 Out of Scope）
  - 每个功能的 Given/When/Then（正常 / 边界 / 错误三种路径）
  - 数据模型草图
  - 验收标准清单（每条可独立判定）
  - BLOCKING Q&A（模糊点必须填，不能留空）

规则内化:
  AI-001, AI-003, AI-006
```

### 2.3 Tech Lead Subagent — 技术方案

```
【输入】docs/prd/{feature}.md
【产出】docs/spec/{feature}.tech.md
【禁读】跳过 contracts 直接写实现；跳过 Dx 决策编号

Tech-Spec 模板包含:
  - 架构决策 (D1, D2, ... Dn) 每个含 方案选择 + 理由 + 被拒绝方案
  - contracts 变更（新增/修改的 Zod schema）
  - 错误码定义（从 ErrorCode 枚举派生）
  - 状态机或生命周期定义
  - 变更清单（新增文件 / 修改文件 / 删除文件）
  - 迁移方案（如有）+ 回滚步骤
  - 测试策略

规则内化:
  AI-001, ARCH-001, ARCH-002, ARCH-003, CODE-001, CODE-003, CODE-004, SEC-001, SEC-002, SEC-003, AI-005
```

### 2.4 test-writer Subagent — 测试先行

```
【输入】docs/spec/{feature}.tech.md + PRD 验收标准
【产出】{feature}.test.ts 或 {feature}.e2e.test.ts（红 — 全部 pending/fail）
【禁读】看参考实现或参考测试写

产出包含:
  - 按 Given/When/Then 组织的 test suite
  - 正常路径 × N
  - 边界条件 × N
  - 错误路径 × N
  - 覆盖率检查清单（对照 PRD 验收标准逐条标注"已覆盖/未覆盖/不适用"）
  - 所有测试初始为 pending 或预期 fail（红色）

规则内化:
  AI-002, AI-007, SEC-003a（输出 schema 必须 .strict()）, CODE-002
```

### 2.5 impl-writer Subagent — 实现

```
【输入】docs/spec/{feature}.tech.md + 红色测试
【产出】四层实现代码 + 绿色测试
【禁读】跳过测试直接写实现；跳过 contracts 导入

实现顺序:
  contracts 层 → domain 层 → repository 层 → service 层 → router 层
  每层实现后，运行对应层的测试直到全绿
  所有测试绿后，运行 check-rules.mjs → typecheck → vitest 全量

规则内化:
  全部 20 条规则
```

### 2.6 Reviewer Subagent — 审核

```
【输入】PR diff + PRD + Tech-Spec + 测试报告
【产出】docs/review/{feature}-review.md
【禁读】跳过门禁直接 approve

审核检查清单:
  G1: PRD 存在且验收标准完整
  G3: Tech-Spec 存在且 Dx 决策有理由
  G3.5: Spec-Binding: Dx ↔ 代码注释双向绑定
  G4: 测试覆盖 PRD 所有 Given/When/Then
  G5: 三件套全绿
  G6: check-rules.mjs 阻断项全过
  G6.1: META-003/004 匹配
  G6.5: 无 hardcoded 凭据 (SEC-002)
  G7: 代码 review (逐方法核对)
```

---

## 三、门禁定义

| 门禁 | 检查项 | 校验方式 |
|------|--------|----------|
| G1 | PRD 存在、AC 包含正常/边界/错误三类路径、BLOCKING Q&A 已填写 | Reviewer 逐项核对 |
| G3 | Tech-Spec 存在、D1~Dn 决策完整（含理由+拒绝方案）、contracts 变更已定义 | Reviewer 逐项核对 |
| G3.5 | Spec-Sync: Spec 决策编号 Dx ↔ 代码注释 TECH-XXX-001 Dx 双向绑定 | check-spec-binding.mjs |
| G4 | 测试文件存在、每条 Given/When/Then 有对应断言、覆盖率检查清单完整 | Reviewer 逐项核对 + vitest |
| G5 | `pnpm trinity` 全绿 (typecheck + check-rules + test) | CI |
| G6 | check-rules.mjs 全部阻断项通过 | CI |
| G6.1 | META-003 (声明即实现) + META-004 (实现即声明) 通过 | CI |
| G6.5 | SEC-002 (无硬编码凭据) 通过 | CI |
| G7 | 代码 review 通过（逐方法核对）+ AI-005 SSOT 派生确认 | Reviewer |
| G8 | 复盘已写入 docs/retro/round-{N}.md + lessons-learned.md 已更新 (META-005) | CI (retro-gate job) |

---

## 四、复盘反推机制

每轮迭代完成后，必须执行复盘并把教训反推到工作流中。反推三层：

```
Layer 1 — 复盘记录: docs/retro/round-{N}.md
  （发生了什么、哪里卡住了、下次怎么避免）

Layer 2 — 规则更新: .trae/rules/
  （可脚本化的问题 → 新增或修改规则 + check-rules.mjs enforcement）

Layer 3 — 提示词更新: docs/workflow/spec-first-workflow.md 角色骨架
  （角色行为偏差 → 更新对应 subagent 的提示词/禁读/上下文）
```

反推检查清单：
- [ ] 本轮 blocker 是否可以变为下轮的 check-rules.mjs 分支？
- [ ] 本轮 Spec 模糊导致的问题是否可以变为 PRD 模板的必填项？
- [ ] 本轮角色偏差是否可以变为"禁读"条目的更新？

---

## 五、规则集索引

20 条规则，分 5 类：

| 类别 | 规则 | 文件位置 |
|------|------|----------|
| AI 行为 | AI-001 ~ AI-007 | .trae/rules/ai-behavior/ |
| 架构 | ARCH-001 ~ ARCH-003 | .trae/rules/architecture/ |
| 编码 | CODE-001 ~ CODE-004 | .trae/rules/coding/ |
| 安全 | SEC-001 ~ SEC-003 | .trae/rules/security/ |
| 元规则 | META-001 ~ META-004 | .trae/rules/meta/ |

---

## 六、新项目复用步骤

1. 复制 `.trae/rules/` 到新项目
2. 复制 `scripts/check-rules.mjs`，适配新项目路径
3. 复制本文件 `docs/workflow/spec-first-workflow.md`
4. 创建初始 `AGENTS.md`、`docs/retro/round-1-delta.md`
5. 写入首轮上下文快照 `pnpm snapshot`
6. 跑首次 check-rules，修正路径相关错误
7. 开始第一轮 G1 → G3 → G4 → G5 → G7

---

## 七、Skill 化评估

| 脚本 | 可 skill 化？ | 原因 |
|------|-------------|------|
| gen-context-snapshot | 否 | 依赖 git/文件系统状态 |
| gen-round-delta | 否 | 依赖 git diff/tag |
| check-rules | 否 | CI 环境执行，纯脚本 |
| Orchestrator | 是 | 编排逻辑可提示词化，但需要子 agent 支持 |

---

_本工作流基于 AIAdmin dev-rules 分支验证的 24 轮迭代经验，适配 PersonaChat 技术栈。_
