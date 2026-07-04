# PersonaChat AI Native 改造方案

> 卡帕西视角 · 基于 AIAdmin dev-rules 工作流对标分析
> 日期: 2026-07-05

---

## 一、当前状态诊断

### 1.1 项目基线

PersonaChat 是一个微信小程序 + Cloudflare Workers 的 AI 人格聊天应用，已经完成了第一轮 AI Native 架构重构（monorepo + 契约层 + 四层后端 + 规则体系），但工作流成熟度与 AIAdmin dev-rules（24 轮迭代验证）差距巨大。

### 1.2 对标差距矩阵

| 维度 | AIAdmin (参考) | PersonaChat (当前) | 差距等级 |
|------|---------------|-------------------|----------|
| **AGENTS.md** | 完整 AI agent 工作指引 | 不存在 | P0 致命 |
| **META 规则** | 4 条元约束（无校验不立规/规则PR准入/声明即实现/实现即声明） | 不存在 | P0 致命 |
| **check-rules.mjs** | 13 项 enforcement（ARCH/CODE/SEC/AI/META 全覆盖） | 4 项（ARCH-002/CODE-001/ARCH-001/CODE-004） | P0 致命 |
| **check-spec-binding.mjs** | Spec↔Code 双向绑定校验 | 不存在 | P1 高 |
| **CI workflow** | ci.yml（trinity + e2e-local 双 job） | 不存在 | P1 高 |
| **工作流文档** | 7 节完整模板 + 五角色提示词骨架 + 增量上下文机制 | 基础概述（56 行） | P0 致命 |
| **context-snapshot** | 架构概览+规则速查+路由表+契约速查+关键约定 | 仅目录列表+文档索引 | P1 高 |
| **gen-round-delta** | --round --tag 支持，A1 增量上下文 | 无参数，纯模板生成 | P1 高 |
| **规则文件质量** | 每条含机器可校验的"校验方式"段 | "校验方式"段为纯主观描述 | P0 致命 |
| **复盘体系** | 24 轮，lessons-learned 索引，反推三层机制 | 1 轮，3 条教训，无反推 | P2 中 |
| **生产就绪 WARNING** | server.ts 顶部 6 项加固缺口 | 无 | P2 中 |
| **AI-005 SSOT 派生** | 跨域枚举断言用 `[...schema.options]` | AI-005 规则是"Spec 前再重构"（语义偏移） | P0 致命 |
| **AI-007 端到端验收** | PRD 逐条 Given/When/Then 有 E2E 覆盖 | 不存在 | P1 高 |
| **advisory/[约束] 偏离管理** | 双轨制（advisory 须反向同步，[约束] 须显式标注+反向同步+Reviewer确认） | 不存在 | P1 高 |

### 1.3 核心问题诊断

**问题 1：规则是"纸老虎"——定义了但不可机器校验**

16 条规则中，只有 4 条有 check-rules.mjs 的 enforcement 分支。其余 12 条的"校验方式"段写的是"代码 review 时检查"——这不是 AI Native，这是人肉 Native。AIAdmin 的 META-001 原则说得好：**无校验不立规**。

```
PersonaChat 当前规则 enforcement 覆盖率: 4/16 = 25%
AIAdmin dev-rules enforcement 覆盖率:    13/13 = 100%
```

**问题 2：AI-005 语义偏移——规则编号被占用了**

PersonaChat 的 AI-005 是"重构前必须先读 Spec"，但 AIAdmin 的 AI-005 是"禁止硬编码跨域可变集合，用 SSOT 派生断言"。前者其实是 AI-001 的子集（先读 Spec），后者是一个独立的、可机器校验的横切关注点。语义偏移会导致规则体系混乱。

**问题 3：缺少 META 元约束——规则系统没有自校验**

AIAdmin 的 META-003/004 实现了"声明即实现，实现即声明"的双向绑定：规则文档声称用 check-rules.mjs 校验 → 脚本必须有对应分支；脚本有 enforcement 分支 → 规则文档必须有对应规则。PersonaChat 没有这个机制，所以规则和校验脚本可以随意不同步。

**问题 4：工作流文档缺少"可执行性"**

当前 spec-first-workflow.md 只有 56 行，定义了五角色和七门禁的名字，但缺少：
- 五角色的**提示词骨架**（输入/产出/禁读/上下文文件清单/规则内化）
- 门禁的**具体检查项**（不是"字段齐全"这种模糊描述，而是"BLOCKING 项已拍板"这种可判定条件）
- **A1 增量上下文机制**（每轮先读 < 3KB 的 delta，而非全量 context-snapshot）
- **反推机制**（复盘不是总结，是把坑变成下次的规则/提示词/模板）

**问题 5：缺少 AGENTS.md——AI agent 没有"工作手册"**

AIAdmin 的 AGENTS.md 是 AI agent 在仓库内工作的第一入口，定义了：
- 接到任务时的第一动作（先读 Spec → 再读规则 → 再读教训索引 → 读增量上下文）
- 不要做的事（不读 PRD 写实现、不读测试写实现等）
- 五角色速查表
- 7 道门禁速查表
- 常见任务路由

没有这个文件，AI agent 每次进来都要重新理解项目约定。

---

## 二、改造方案

### 2.1 改造原则

1. **工作流优先于代码**：当工作流与代码冲突时，工作流优先（AIAdmin 核心认知）
2. **无校验不立规**：每条规则必须有可脚本化校验的条件（META-001）
3. **声明即实现**：规则文档声称的校验方式，脚本必须有对应分支（META-003）
4. **实现即声明**：脚本的 enforcement 分支，规则文档必须有对应规则（META-004）
5. **适配而非复制**：PersonaChat 是 Hono+CF Workers+小程序，不是 node:http+React，规则要适配技术栈

### 2.2 改造路线图（5 个 Phase）

```
Phase 0: META 基础设施  →  Phase 1: 规则系统升级  →  Phase 2: 工作流文档升级
Phase 3: CI + Spec-Binding  →  Phase 4: 上下文系统升级  →  Phase 5: 首轮验证
```

---

### Phase 0: META 基础设施（P0 致命）

**目标**：建立规则系统的自校验机制，使"规则↔脚本"双向绑定。

**产物**：

1. **新建 `.trae/rules/meta/` 目录**，包含 4 条 META 规则：

| 规则 ID | 标题 | 核心约束 |
|---------|------|----------|
| META-001 | 无校验不立规 | 每条非 META 规则的"校验方式"段须含机器校验关键词（check-rules/tsc/vitest/ci 等） |
| META-002 | 规则 PR 准入 | 规则文件改动须同步改 check-rules.mjs |
| META-003 | 声明即实现 | 规则文档声称用 check-rules.mjs 校验 → 脚本有对应 `// === XXX-NNN ===` 分支 |
| META-004 | 实现即声明 | 脚本有 enforcement 分支 → 规则文档有对应规则 ID |

2. **升级 `check-rules.mjs`**：从 4 项 → 13+ 项 enforcement

新增 9 项 enforcement：

```
ARCH-003:  前端禁止 import 后端模块（小程序适配版）
CODE-002:  空 catch + 仅 console catch 检测
CODE-003:  eval + new Function 检测
CODE-004:  Zod schema 命名后缀检测（Schema$）
SEC-001:   路由必须声明 auth 元数据
SEC-002:   service public 方法须调鉴权（适配 Hono 中间件模式）
SEC-003a:  输出 schema 须 .strict()
AI-005:    禁止硬编码跨域可变集合断言
META-001/003/004: 规则↔脚本双向绑定校验
```

**适配要点**：
- ARCH-003 的"前端"从 `apps/web/src` 改为 `apps/miniprogram/src`，但小程序用相对路径 import，需适配检测逻辑
- SEC-001 的"procedure 对象"改为 Hono 路由声明（`app.get/post/put/delete`），检测是否有 auth 中间件或 `public` 标注
- SEC-002 的 `requireAdmin` 改为适配 PersonaChat 的鉴权模式（当前无鉴权层，需新增或标注 advisory）

---

### Phase 1: 规则系统升级（P0 致命）

**目标**：修复规则语义偏移，补齐缺失规则，所有规则可机器校验。

**产物**：

1. **修复 AI-005 语义偏移**：
   - 当前 AI-005（"重构前必须先读 Spec"）→ 合并到 AI-001
   - 新 AI-005：禁止硬编码跨域可变集合，用 SSOT 派生断言（`[...schema.options]`）
   - 同步更新 check-rules.mjs 的 AI-005 enforcement 分支

2. **新增 AI-007 规则**：
   - 端到端验收 + PRD 逐条核对
   - 每条 Given/When/Then 须有端到端断言覆盖

3. **所有 16 条规则的"校验方式"段重写**：
   - 从"代码 review 时检查"→ 明确的机器校验条件
   - 格式：`校验方式：check-rules.mjs <规则ID> 分支 + Reviewer 逐方法核对`

4. **规则文件头部统一**：
   - 添加 `> 历史演进明细见 docs/retro/lessons-learned.md`
   - 保留 [约束]/[advisory]/TECH-ID/D 决策编号/规则 ID

---

### Phase 2: 工作流文档升级（P0 致命）

**目标**：从 56 行概述 → 完整可执行的工作流编排模板。

**产物**：

1. **重写 `docs/workflow/spec-first-workflow.md`**，7 节完整模板：

```
§1 工作流总览（流程图 + AI-001~007 核心原则）
§2 五角色提示词骨架
   §2.1 编排者（Orchestrator）
   §2.2 BA subagent
   §2.3 Tech Lead subagent
   §2.4 test-writer subagent
   §2.5 impl-writer subagent
   §2.6 Reviewer subagent
§3 门禁定义（G1/G3/G3.5/G4/G5/G6/G6.1/G6.5/G7）
§4 复盘反推机制
§5 规则集索引
§6 新项目复用步骤
§7 skill 化评估
```

每个角色骨架包含：
- 输入 / 产出 / 禁读
- 上下文文件清单（最小上下文包）
- 规则内化清单
- 门禁定义

**适配要点**：
- 五角色的文件路径从 `apps/web/` → `apps/miniprogram/`
- "spawn 真实 server + fetch"的 embedding 测试 → 适配 CF Workers 的 Miniflare 本地测试
- 路由表从 `server.ts` → PersonaChat 的 Hono 路由声明

2. **新建 `AGENTS.md`**（根目录）：

AI agent 工作手册，包含：
- 项目定位（先读这一段）
- 接到任务时的第一动作
- 不要做的事
- 五角色速查表
- 7 道门禁速查表
- 每次改动必跑三件套
- 关键约束速查
- 常见任务路由

---

### Phase 3: CI + Spec-Binding（P1 高）

**目标**：自动化门禁执行 + Spec↔Code 双向绑定校验。

**产物**：

1. **新建 `.github/workflows/ci.yml`**：

```yaml
# 两个 job：
# 1. trinity: typecheck + lint:rules + lint:spec-binding + vitest
# 2. e2e-local: 小程序端到端测试（适配后）
```

2. **新建 `scripts/check-spec-binding.mjs`**：

校验 Spec 决策编号 Dx ↔ 代码注释 TECH-XXX-001 Dx 双向绑定。
- 漂移（error，阻断）：Spec 有 Dx 但代码引用了不存在的 Dx
- 缺口（warning，不阻断）：Spec 有 Dx 但代码未引用

3. **package.json 注册新脚本**：
```json
"lint:rules": "node scripts/check-rules.mjs",
"lint:spec-binding": "node scripts/check-spec-binding.mjs"
```

---

### Phase 4: 上下文系统升级（P1 高）

**目标**：从低信息密度的文件列表 → AI agent 可用的高密度上下文快照。

**产物**：

1. **升级 `scripts/gen-context-snapshot.mjs`**：

输出包含：
- 项目概览（规则数/契约数/API 源文件数/文档数）
- 目录结构（按层级）
- 架构速查（四层依赖方向 + 契约层纯净约束）
- 规则速查表（规则 ID → 文件 → 校验方式）
- 路由表（从 server.ts 自动提取）
- 契约速查（Schema 名 → 文件 → 字段概览）
- 关键约定速查（错误码映射 / 鉴权模式 / PII 边界）
- 文档索引
- 最近轮次

2. **升级 `scripts/gen-round-delta.mjs`**：

支持 `--round N --tag` 参数：
- `--round N`：指定轮次编号
- `--tag`：打 git tag 供下一轮 from 用
- 输出 < 3KB 的增量上下文，包含：本轮目标 / 变更文件清单 / 需遵守的规则 / 上轮教训

3. **升级 `scripts/gen-retro-index.mjs`**：

新增量化对比表（轮次/类型/AC/测试/blocker/verdict 摘要）。

---

### Phase 5: 首轮验证（P2 中）

**目标**：用一个最小业务域跑通全链路，验证改造后的工作流可运转。

**建议验证域**：人格域（persona）的 CRUD 完整化

**验证步骤**：
1. BA 产出 `docs/prd/R3-persona-crud.md`（含 AC + BLOCKING Q&A）
2. Tech Lead 产出 `docs/spec/persona.tech.md`（含 D1~Dn 决策 + contracts + errors）
3. test-writer 产出 `apps/api/test/persona.test.ts`（断言级红）
4. impl-writer 产出四层实现
5. Reviewer 产出 `docs/review/persona-review.md`
6. 跑三件套 + spec-binding 全绿
7. 复盘 `docs/retro/round-3.md` + 反推

---

## 三、技术适配清单

PersonaChat 与 AIAdmin 的技术栈差异需要适配：

| 维度 | AIAdmin | PersonaChat | 适配策略 |
|------|---------|-------------|----------|
| 后端框架 | node:http（零框架） | Hono | SEC-001 检测 Hono 路由声明的 auth 元数据 |
| 数据库 | node:sqlite | Cloudflare D1 | 不影响规则，影响测试策略 |
| 部署 | 本地 | CF Workers | CI e2e 改用 Miniflare 本地测试 |
| 前端 | React + Vite | 微信小程序 | ARCH-003 适配小程序 import 检测 |
| 包管理 | npm workspace | pnpm workspace | 脚本中 `npm` → `pnpm` |
| 测试 | Vitest + Playwright | Vitest | E2E 改用小程序模拟器或 API 级 E2E |
| 鉴权 | Bearer token 五守卫 | 无鉴权（当前） | SEC-001/002 标注 advisory，首轮不强制 |

---

## 四、改造优先级排序

```
P0 致命（不做无法称为 AI Native）：
  1. Phase 0: META 基础设施 + check-rules.mjs 升级到 13 项
  2. Phase 1: 规则系统升级（修复 AI-005 + 所有规则可校验）
  3. Phase 2: 工作流文档升级 + AGENTS.md

P1 高（不做效率低但可运转）：
  4. Phase 3: CI + Spec-Binding
  5. Phase 4: 上下文系统升级

P2 中（验证性工作）：
  6. Phase 5: 首轮验证
```

---

## 五、卡帕西的判断

说实话，PersonaChat 当前的状态像是一个"穿了 AI Native 外衣的传统项目"——有 monorepo、有契约层、有四层架构、有规则文件，但核心的**工作流编排能力**几乎是空的。

问题不在于代码写得不好，而在于**规则不可校验、工作流不可执行、AI agent 无章可循**。这就像你写了一部宪法但没有任何执法机构——规则的存在不等于规则的执行。

AIAdmin dev-rules 的真正价值不是那 1272 个测试用例，而是经过 24 轮迭代验证的**工作流机器化**：每条规则可校验、每个角色有提示词骨架、每轮复盘有反推机制、Spec 与代码有双向绑定。这才是 AI Native 的本质——**开发流程由 AI agent 编排，而非人指挥 AI 写码**。

改造的核心动作就三个：
1. **让规则可校验**（META-001~004 + check-rules.mjs 13 项）
2. **让工作流可执行**（五角色提示词骨架 + 7 道门禁 + AGENTS.md）
3. **让上下文可增量**（A1 delta + 高密度 context-snapshot）

做完这三件事，PersonaChat 才真正具备 AI Native 的骨架。剩下的就是一轮一轮跑迭代，让工作流逐轮收敛。

---

*本方案基于 AIAdmin dev-rules 分支（commit 021d322）与 PersonaChat 当前状态的对比分析。*
