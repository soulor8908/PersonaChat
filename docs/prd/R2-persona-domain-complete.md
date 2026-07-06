---
doc_type: prd
id: R2
title: 人格域完整实现 + 可运行验证
version: 1.0
status: approved
---

# PRD: 人格域完整实现 + 可运行验证 (Round 2)

> **角色**: BA | **状态**: 回溯补齐 | **对应实现**: Round 2 (已交付)

---

## 一、需求背景

Round 1 搭建了 monorepo 骨架和四层架构，但项目尚未真正运行验证。人格域虽然已有四层结构，但缺少：

1. 批量同步脚本（从 GitHub *-skill 仓库抓取数据）
2. 数据库初始化种子数据
3. 必要的配置文件（sitemap.json 等）
4. 依赖安装和编译验证
5. 单元测试

**目标**: 让 PersonaChat 后端可启动、有种子数据、有测试覆盖，为后续轮次提供可验证的基础。

## 二、用户故事

| ID | 故事 |
|----|------|
| US-201 | 作为用户，打开小程序能看到人格列表，而不是空页面 |
| US-202 | 作为维护者，跑一条命令就能从 GitHub 批量同步人格 |
| US-203 | 作为 AI 开发者，有测试覆盖才能安全重构 |

## 三、功能需求

### F1: 批量人格同步命令
- 从 `alchaincyf/*-skill` 仓库抓取 `SKILL.md`，解析后写入 D1
- `scripts/seed.mjs` 创建初始数据

### F2: 数据库种子数据
- `apps/api/schema.sql` 表结构定义
- `apps/miniprogram/sitemap.json` 等小程序配置

### F3: 项目依赖安装
- `pnpm install` 全量安装，解决 workspace 依赖链

### F4: 单元测试
- contracts schema 测试（`packages/contracts/test/persona.test.ts` + `chat.test.ts`）
- persona-parser 测试（`apps/api/test/persona-parser.test.ts`）
- 路由测试（`apps/api/test/persona.e2e.test.ts`）

### F5: 验证后端可启动
- `pnpm dev` 在 wrangler 开发服务器下正常运行

### 影响模块（变更清单）

| 模块 | 影响类型 | 说明 |
|------|----------|------|
| `apps/api/src/domain/persona-parser.ts` | 增强 | 补充 extractName 的 fallback 逻辑 |
| `apps/api/src/service/persona-svc.ts` | 增强 | 补充 batchSync 方法 |
| `scripts/` | 新增 | seed.mjs 批量同步脚本 |
| `apps/api/test/` | 新增 | 单元测试 |
| `apps/miniprogram/` | 新增 | sitemap.json |

### Out of Scope

| 条目 | 原因 |
|------|------|
| 实现前端 UI 改造（小程序页面） | 后端可验证即可，UI 在 R11 才系统对齐 |
| 鉴权层 | SEC-001 advisory，本轮仅完成可运行验证 |
| 流式输出（SSE） | 由 R7 处理 |
| 对话分支/评价反馈/记忆 | 由 R7 处理 |
| LLM 可观测性 | 由 R7 处理 |
| CI 流水线 | 由后续轮次处理 |

### 数据模型草图

> **审计补齐 (2026-07-06)**：R2 涉及 `apps/api/schema.sql` 表结构定义（F2）和 `ensureTables()` 自动建表（AC-212），原 PRD 缺数据模型草图段落，现补齐。以下为 R2 时期的表结构（不含 R7/R9 后续轮次新增的字段）。

#### personas 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | 人格 ID（kebab-case，源自 GitHub 仓库名） |
| name | TEXT | NOT NULL | 人格显示名 |
| description | TEXT | DEFAULT '' | 人格描述（一句话） |
| category | TEXT | NOT NULL | 分类（leader/educator/thinker/...） |
| system_prompt | TEXT | NOT NULL | System Prompt（LLM 系统提示词） |
| source_url | TEXT | NULLABLE | GitHub 源地址 |
| stargazers_count | INTEGER | DEFAULT 0 | GitHub stars 数 |
| created_at | INTEGER | NULLABLE | 创建时间戳（Unix ms） |
| updated_at | INTEGER | NULLABLE | 更新时间戳（Unix ms） |

索引：`idx_personas_category ON personas(category)`

#### chat_records 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 记录 ID |
| user_id | TEXT | NOT NULL | 用户 ID（R2 时期固定 'anonymous'） |
| persona_id | TEXT | NOT NULL | 关联 personas.id |
| messages | TEXT | NOT NULL | 消息历史 JSON |
| reply | TEXT | NOT NULL | LLM 回复 |
| model | TEXT | NULLABLE | 使用的模型 ID |
| created_at | INTEGER | NOT NULL | 创建时间戳 |

索引：`idx_chat_records_user ON chat_records(user_id, created_at DESC)` + `idx_chat_records_persona ON chat_records(persona_id)`

#### 迁移策略

- 首次部署：`ensureTables()` 在 server.ts 启动时自动执行 `schema.sql`（AC-212）
- 重复执行：`CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` 保证幂等
- 无破坏性 schema 变更（新建表，不修改已有表）

## 四、验收标准

### 正常路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-201 | monorepo 已搭建（R1 完成） | `pnpm install` 从根目录执行 | 成功无报错，所有 workspace 依赖解析 |
| AC-202 | GitHub 可达 + 目标仓库存在 SKILL.md | `node scripts/seed.mjs` 执行 | 从 GitHub 批量拉取人格并写入 D1 |
| AC-203 | contracts + persona-parser + 路由测试已建 | `pnpm vitest run` 运行 | 全部测试通过 |
| AC-204 | 后端已配置 wrangler + D1 | `pnpm dev` 启动 | wrangler 开发服务器正常运行 |
| AC-205 | 后端已启动 | `curl /api/health` 请求 | 返回 200 + `{ ok: true }` |
| AC-206 | 已有种子数据 | `curl /api/personas` 请求 | 返回非空 persona 列表 |
| AC-207 | 项目结构完整 | `pnpm check` 运行 | 22 项 enforcement 全过 |

### 边界条件

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-208 | 同步脚本中部分 GitHub 仓库不存在或 SKILL.md 缺失 | 执行 seed.mjs | 跳过该仓库，记录错误，继续同步其他仓库 |
| AC-209 | SKILL.md 格式不规范（无 System Prompt 段） | persona-parser 解析 | 取全文前 4000 字符作为 system prompt（fallback） |
| AC-210 | 单仓库网络请求超时 | seed.mjs 拉取 | 单个仓库超时 10s，不阻塞整体同步 |
| AC-211 | 重复同步同一人格 | seed.mjs 执行 | UPSERT 逻辑，同名 ID 覆盖更新 |
| AC-212 | 数据库未初始化（首次启动） | server.ts fetch 入口 | `ensureTables()` 自动建表，不阻断请求 |

### 错误路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-213 | GitHub 整体不可达（断网） | seed.mjs 执行 | 同步失败，脚本退出并打印错误日志 |
| AC-214 | D1 数据库连接失败 | 后端启动 | wrangler 报错，启动失败（需配置本地 D1） |
| AC-215 | persona-parser 输入为空字符串 | 调用 extractName | 返回 null（不抛异常） |
| AC-216 | persona-parser 输入无 markdown header | 调用 extractName | 返回 null（不抛异常） |
| AC-217 | persona schema 缺少必填字段（如 id） | `personaSchema.parse(...)` | 抛 ZodError，被 error-handler 转为 400 响应 |

## 五、测试映射

| PRD AC | 测试文件 | 测试类型 | 覆盖说明 |
|--------|---------|---------|---------|
| AC-201 | `pnpm install` | 集成 | workspace 依赖解析 |
| AC-202 / AC-208 / AC-209 / AC-210 | `scripts/seed.mjs` | 集成（手动） | 同步脚本边界行为 |
| AC-203 / AC-217 | `packages/contracts/test/persona.test.ts` | 单元 | personaSchema parse 正确性 + 拒绝非法输入 |
| AC-203 / AC-217 | `packages/contracts/test/chat.test.ts` | 单元 | chatMessageSchema/chatRequestSchema parse 正确性 |
| AC-203 / AC-215 / AC-216 | `apps/api/test/persona-parser.test.ts` | 单元 | extractName/extractSystemPrompt/extractDescription + 异常输入 |
| AC-203 / AC-207 | `apps/api/test/persona.e2e.test.ts` | E2E | persona 路由 Zod 校验 |
| AC-204 / AC-205 | 手动 + `pnpm dev` | 集成 | wrangler 启动验证 |
| AC-206 | `apps/api/test/persona.e2e.test.ts` | E2E | persona 列表返回非空 |
| AC-207 / AC-212 | `scripts/check-rules.mjs` | 静态 | 22 项 enforcement 全过 |
| AC-214 | `apps/api/test/persona.e2e.test.ts`（mock D1） | E2E | 路由错误处理 |

## 六、BLOCKING Q&A

> 以下为 BA 在编写 PRD 过程中发现的歧义或缺失信息，需要相关方确认后方可推进后续轮次。

### Q1: 批量同步的 GitHub 仓库清单是否稳定？仓库所有权与维护责任是什么？

**问题**: `alchaincyf/*-skill` 仓库清单是否作为长期 SSOT？仓库被删除/重命名时的兜底策略是什么？同步频率（一次性 vs 定时任务）？同步失败的告警通知机制？是否需要支持从其他 owner 的仓库同步？

**建议确认方**: 项目所有者 / 后端开发

### Q2: SKILL.md 格式不规范时的兜底策略边界？

**问题**: PRD 提到"无 System Prompt 段时取全文前 4000 字符作为 system prompt"，但 4000 字符的依据是什么？是否考虑 OpenAI/DeepSeek/GLM 等不同模型的 token 限制？SKILL.md 包含恶意指令（prompt injection）时如何处理？SKILL.md 编码非 UTF-8 时如何降级？

**建议确认方**: 后端开发 / 安全负责人
