# AGENTS.md — PersonaChat AI Agent 工作手册

> **先读这一段。**
> PersonaChat 是一个 AI 人格聊天系统。你在一个 AI-Native 项目中工作。你不是来帮忙写代码的，你是来**编排开发流程**的。
> 技术栈：Hono + Cloudflare Workers + D1（后端）+ 微信小程序（前端）+ pnpm workspace + Zod SSOT contracts。

---

## 接到任务时的第一动作

```
Step 0: ⛔ 编码前自查清单（以下任一不满足 → 拒绝编码，先补齐）
  □ docs/prd/{feature}.md 存在且 AC 清单完整（正常/边界/错误三类）
  □ docs/spec/{feature}.tech.md 存在且含 Dx 决策表
  □ 上述两项不存在 → spawn BA + Tech Lead subagent 补全
Step 1: 读 docs/context-snapshot.md（架构速查 + 规则速查表 + 路由表 + 契约速查）
Step 2: 读 .trae/rules/ 下适用规则（至少把对应分类的规则扫一遍）
Step 3: 读 docs/retro/lessons-learned.md（不重复已知错误）
Step 4: 读 docs/round-{N}-delta.md（< 3KB 增量上下文，含上轮教训 + 本轮约束）
Step 5: 定位 docs/prd/ 或 docs/spec/ 下对应 Spec 文件
Step 6: 如果无 Spec → 拒绝编码，先 spawn BA subagent 写 PRD
```

## 不要做的事

- **不要**跳过 Spec 直接写代码（违反 AI-001）
- **不要**跳过测试直接写实现（违反 AI-002）
- **不要**做 Spec 范围外的事（违反 AI-003）
- **不要**提交前不跑 `pnpm trinity`（违反 AI-004）
- **不要**硬编码可变集合，用 contracts SSOT 派生（违反 AI-005）
- **不要**在遇到歧义时自行假设（违反 AI-006）
- **不要**跳过 E2E 验收直接合入（违反 AI-007）
- **不要**在 contracts 层引入运行时依赖（违反 ARCH-002）
- **不要**让小程序 import 后端模块（违反 ARCH-003）
- **不要**用 `any` 类型（违反 CODE-001）
- **不要**吞异常 — 要么处理要么上抛（违反 CODE-002）
- **不要**硬编码 API key / secret / token（违反 SEC-002）
- **不要**跳过输入校验 — 路由层必须 Zod.parse()（违反 SEC-003）
- **不要**在 apps/web 中添加页面组件而不添加冒烟测试（违反 FRONTEND-001）
- **不要**使用不存在的 Tailwind CSS class（违反 FRONTEND-003）

## 五角色速查

| 角色 | 做什么 | 输入 | 产出 |
|------|--------|------|------|
| **BA** | 需求分析，写 PRD | 用户需求 | `docs/prd/{feature}.md` |
| **Tech Lead** | 技术方案，写 Tech-Spec | PRD | `docs/spec/{feature}.tech.md` |
| **test-writer** | 测试先行，写红色测试 | PRD + Tech-Spec | `{feature}.test.ts` (红) |
| **impl-writer** | 实现，让测试变绿 | Tech-Spec + 红色测试 | 实现代码 + 绿色测试 |
| **Reviewer** | 审核，过门禁 | PR diff + Spec + 测试报告 | `docs/review/{feature}-review.md` |

详细提示词 → `docs/workflow/spec-first-workflow.md` 第二节。

## 门禁速查

> **重要变更**：AI-001 / AI-002 / AI-003 / AI-007 已从 `[advisory]` 升级为 **machine-enforced**。`pnpm trinity` 会自动阻断"跳过 Spec 直接写码"等流程违规，不再依赖 agent 自觉。

| 门禁 | 检查项 | 校验方式 | Fail 怎么办 |
|------|--------|----------|------------|
| G0 | **流程合规 — Spec-First (AI-001)** | 改动功能源码时 `docs/prd/` + `docs/spec/*.tech.md` 必须同步改动；重构需附 `docs/spec/backrefactor-*.md` | 驳回：先补 PRD/Tech-Spec 再写码 |
| G0 | **流程合规 — 测试先行 (AI-002)** | 改动功能源码时 `.test.ts` / `.e2e.test.ts` 必须同步改动 | 驳回：先写失败测试再实现 |
| G0 | **流程合规 — 越界检测 (AI-003)** | 改动源码文件 basename 必须出现在 Tech-Spec "## 变更清单" 表格中 | 驳回：补声明或回退越界改动 |
| G0 | **流程合规 — E2E 验收 (AI-007)** | 改动 `docs/prd/*.md` 时必须有测试文件同步改动 | 驳回：补 E2E 测试覆盖新 AC |
| G1 | PRD 有完整 AC（正常/边界/错误） | Reviewer 核对 | 驳回 BA |
| G3 | Tech-Spec 有 Dx 决策 + 变更清单表格 | Reviewer 核对（G0 越界检测依赖此表格） | 驳回 Tech Lead |
| G3.5 | Spec↔Code Dx 双向绑定 | `check-spec-binding.mjs` | 补齐注解或 Spec |
| G4 | 测试覆盖全部 Given/When/Then | Reviewer 核对 + vitest | 驳回 test-writer |
| G5 | `pnpm trinity` 全绿 | CI | 驳回 impl-writer |
| G6 | check-rules.mjs 阻断项全过（22 项 enforcement） | CI | 驳回 impl-writer |
| G7 | Reviewer 逐方法核对通过 | Reviewer | 驳回并标注需改 |
| G8 | UI 渲染测试 — `apps/web/src/test/` 中每个页面有冒烟测试 | CI (FRONTEND-001) | 缺测试驳回 impl-writer |
| G9 | Tailwind CSS 无矛盾 class — ESLint `no-contradicting-classname` 无 error | CI | 有 error 驳回 impl-writer |

### 流程门禁触发条件（G0）

`check-rules.mjs` 通过 `git diff` 检测本次改动文件。三种触发模式：

1. **CI 场景**：`BASE_REF=origin/main node scripts/check-rules.mjs` — 比较 PR base ref 与 HEAD
2. **本地场景**：`node scripts/check-rules.mjs` — 比较工作树 vs HEAD（含未追踪文件）
3. **干净工作树**：所有 G0 门禁 advisory skip（不阻断）

"功能源码"覆盖范围（改动这些文件会触发 G0）：

- `apps/api/src/{domain,repository,service,router}/**/*.ts`（排除 `.test.ts`）
- `packages/contracts/src/schemas/**/*.ts`
- `apps/web/src/pages/**/*.tsx`
- `apps/miniprogram/pages/**/*.{js,ts}`（排除 wxml/wxss/json）

不在以上范围的文件（脚本、配置、文档本身、test 文件）改动不触发 G0。

### 重构场景例外

纯重构（无功能变更）需在 PR 中加入 `docs/spec/backrefactor-<feature>.md`，G0 会自动放行 Spec-First 和测试先行检查。仍要求 trinity 全绿。

## 每次改动必跑

```bash
pnpm trinity    # = typecheck + check-rules + vitest
```

等价于：

```bash
pnpm typecheck && pnpm check && pnpm test
```

阻断项不绿不许合入。

## 关键约束速查

| 约束 | 规则 |
|------|------|
| 依赖方向 | domain → {repository, service, router}，禁止反向 |
| 契约层 | 只依赖 zod + typescript + vitest，不引入运行时 |
| 前端隔离 | 小程序只通过 API 通信，不 import 后端模块 |
| 文件行数 | ≤ 300 行/文件 |
| 类型安全 | 禁止 `any` |
| 输入校验 | 所有路由入口 Zod.parse() |
| 凭据安全 | 无 hardcoded API key/secret/token |
| SSOT | 可变集合在 contracts 定义，业务代码派生 |

## 常见任务路由

| 任务 | 做法 |
|------|------|
| 新增功能 | G1 → G3 → G4 → G5 → G7 全流程 |
| 修 Bug | 先写失败测试（红） → 修复（绿） → 跑 trinity |
| 重构 | 先写回溯 Spec → 跑 trinity 绿 → 重构 → 跑 trinity 绿 |
| 新增规则 | 写 .trae/rules/ 规则文件 → 同步更新 check-rules.mjs → 跑 check |
| 复盘 | 写 round-{N}.md → 反推到规则/提示词/模板三层 → 更新 lessons-learned |

## 生产就绪 WARNING

当前项目处于开发阶段，以下事项上线前必须完成：

- [ ] SEC-001: 实现鉴权层（当前所有路由公开，仅 advisory）
- [ ] SEC-002: 凭据迁移到 CF Workers Secrets 或环境变量
- [ ] CF Workers: 确认 D1 生产数据库绑定
- [ ] 小程序: 配置合法 request 域名 + WebSocket 域名
- [ ] 错误响应: 确认 500 不泄露内部错误信息
- [ ] 速率限制: 实现 API rate limiting
