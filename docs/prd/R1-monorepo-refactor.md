---
doc_type: prd
id: R1
title: 项目重构为 AI-Native 架构
version: 1.0
status: approved
---

# PRD: 项目重构为 AI-Native 架构 (Round 1)

> **角色**: BA | **状态**: 回溯补齐 | **对应实现**: Round 1 (已交付)

---

## 一、需求背景

PersonaChat 最初为一个快速原型项目，代码结构单一（后端单文件 index.js 180 行），类型定义散落，无共享契约层。随着功能增长，这种结构导致：

1. AI 难以理解代码边界和职责划分
2. 前后端类型不一致，运行时错误频发
3. 门禁缺失，质量依赖人工 review
4. 无法自进化——没有复盘反推机制

**目标**: 把原型重构为 AI-Native monorepo，建立"AI 可读、机器可校验、可自进化"的工程骨架。

## 二、用户故事

| ID | 故事 |
|----|------|
| US-101 | 作为 AI 开发者，我希望代码结构清晰可预测，以便我能准确生成代码 |
| US-102 | 作为人类维护者，我希望有自动门禁拦截错误，而不是靠 review |
| US-103 | 作为项目所有者，我希望每次开发都能积累教训，让项目变得越来越好 |
| US-104 | 作为前端开发者，我希望类型从单一 SSOT 派生，避免前后端漂移 |

## 三、功能需求

### F1: Monorepo 骨架
- pnpm workspace + `packages/contracts` + `apps/api` + `apps/miniprogram` 三包结构
- workspace 协议（catalogs/workspace 协议）使 contracts 可被 apps/api import

### F2: Zod 契约层 SSOT
- `packages/contracts/src/schemas/`: persona / chat / user / common 四类 Schema
- 类型与 Schema 同源派生（`z.infer`）

### F3: 后端四层架构
- `domain → repository → service → router`，依赖单向向下
- 中间件层 `middleware/` 横切关注点（cors, error）

### F4: 前端 API 封装
- 小程序 `apps/miniprogram/src/api/client.js` 集中 API 调用
- 仅通过 HTTP 通信，禁止 import 后端模块（ARCH-003）

### F5: 规则体系
- `.trae/rules/` 6 类规则：AI 行为 / 架构 / 编码 / 安全 / 前端 / 元规则
- 至少 12 条规则覆盖 AI-001~006, ARCH-001~003, CODE-001~004, SEC-001~003

### F6: 自动化脚本
- `check-rules.mjs` 机器校验阻断项
- `gen-context-snapshot.mjs` / `gen-round-delta.mjs` / `gen-retro-index.mjs`

### F7: Spec-First 工作流
- `docs/workflow/spec-first-workflow.md` 定义完整 7 阶段流水线
- 5 角色：BA → Tech Lead → test-writer → impl-writer → Reviewer

### Out of Scope

| 条目 | 原因 |
|------|------|
| 实现具体业务功能（人格 CRUD、聊天等） | 本轮仅搭骨架，业务在 R2 起实现 |
| 数据库迁移与种子数据 | 由 R2 处理（含 `scripts/seed.mjs`） |
| 鉴权层（API Key/Token） | SEC-001 advisory，生产前补齐 |
| CI 流水线（GitHub Actions） | 本轮仅本地 `pnpm trinity`，CI 由后续轮次引入 |
| 复盘机制本体 | 规则要求"复盘必写入"，但首轮无历史可复盘 |

## 四、验收标准

### 正常路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-101 | monorepo 已搭建 | `pnpm install` 从根目录执行 | 成功无报错，三个 workspace 包可解析 |
| AC-102 | `packages/contracts` 已建 | `apps/api` 引用 `@personachat/contracts` | TypeScript 编译通过，类型可推导 |
| AC-103 | 后端四层目录已建 | 检查 `apps/api/src/{domain,repository,service,router}/` | 四层目录齐全，依赖方向单向向下 |
| AC-104 | `.trae/rules/` 已建 | 检查规则文件数 | ≥ 12 条规则文件存在 |
| AC-105 | `scripts/check-rules.mjs` 已建 | `node scripts/check-rules.mjs` 运行 | 输出检查报告，无未声明的 enforcement |
| AC-106 | `docs/workflow/spec-first-workflow.md` 已建 | 检查文档 | 7 阶段流水线（G1→G7）完整定义 |

### 边界条件

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-107 | `apps/api/src/router/*.ts` 中存在路由 | 检查每条路由 | 均使用 Zod schema `parse()` 或 `safeParse()`（SEC-003） |
| AC-108 | `apps/miniprogram/src/**/*.js` 中存在源码 | 检查 import 语句 | 无 `import ../api/...` 或引用非 contracts 的 workspace 包（ARCH-003） |
| AC-109 | `packages/contracts/package.json` 中依赖 | 列出 dependencies | 仅含 `zod` + `typescript` + `vitest`（ARCH-002） |
| AC-110 | `apps/api/src/**/*.ts` 源码 | 静态扫描 | 无 `: any` 类型注解（CODE-001） |

### 错误路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-111 | `apps/api/src/domain/*.ts` 中存在 import 反向引用 | 编译/检查 | 阻断 — domain 不应 import service/repository/router（ARCH-001） |
| AC-112 | `apps/api/src/**/*.ts` 中存在空 catch 或仅 console 的 catch | 运行 check-rules | 阻断 — 异常必须处理或上抛（CODE-002） |
| AC-113 | 路由层 `c.req.json()` 后无 `.parse()` | 运行 check-rules | 阻断 — 输入必须经 Zod 校验（SEC-003） |

## 五、测试映射

| PRD AC | 测试文件 | 覆盖说明 |
|--------|---------|---------|
| AC-101 ~ AC-106 | `pnpm install` + `pnpm typecheck` | 构建/类型层面冒烟 |
| AC-107 / AC-113 | `apps/api/test/chat.e2e.test.ts` | 路由 Zod 校验（含 R1~R6 400 用例） |
| AC-107 / AC-113 | `apps/api/test/persona.e2e.test.ts` | persona 路由 Zod 校验 |
| AC-108 | `apps/api/test/persona-parser.test.ts` | 领域纯函数单元测试 |
| AC-109 | `packages/contracts/test/persona.test.ts` | Schema parse 正确性 |
| AC-109 | `packages/contracts/test/chat.test.ts` | Schema parse 正确性 |
| AC-110 / AC-112 | `scripts/check-rules.mjs` | CODE-001/CODE-002 静态扫描 |
| AC-111 | `scripts/check-rules.mjs` | ARCH-001 enforcement |

## 六、BLOCKING Q&A

> 以下为 BA 在编写 PRD 过程中发现的歧义或缺失信息，需要相关方确认后方可推进后续轮次。

### Q1: 旧 miniprogram 目录（原型期）和新 apps/miniprogram 如何共存过渡？

**问题**: 重构前若已存在顶层 `miniprogram/` 目录，与新建的 `apps/miniprogram/` 是否需要并存？过渡期数据迁移路径如何？小程序历史 git 历史是否需要保留？

**建议确认方**: 项目所有者 / 前端开发

### Q2: 规则集 12 条是下限还是上限？后续轮次新增规则的工作流是什么？

**问题**: PRD 要求 ≥ 12 条规则，但 R7-R10 实际会引入 FRONTEND-001/002 与 META-005 等。新增规则需要同步：1) `.trae/rules/` 文件；2) `check-rules.mjs` enforcement 分支；3) `META-003/004` 双向绑定。是否每条规则都必须有 enforcement 分支？advisory 规则如何处理？

**建议确认方**: Tech Lead / 项目所有者
