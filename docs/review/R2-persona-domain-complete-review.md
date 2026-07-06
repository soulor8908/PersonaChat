# Round 2 评审报告: 人格域完整实现 + 可运行验证

> **评审角色**: Reviewer
> **评审日期**: 2026-07-04
> **对应 PRD**: `docs/prd/R2-persona-domain-complete.md`（回溯补齐）
> **对应 Tech-Spec**: `docs/spec/persona-crud.tech.md`（覆盖 R2/R3 CRUD 部分）
> **范围**: F1（批量同步脚本）+ F2（种子数据 + schema.sql）+ F3（依赖安装）+ F4（单元/E2E 测试）+ F5（后端可启动）；CRUD 接口实现（POST/PUT/DELETE）由 persona-crud.tech.md 覆盖，划入 R3 范围
> **状态**: 回溯补齐

---

## 1. 门禁通过状态

| Gate | 状态 | 说明 |
|------|------|------|
| **G0: AI-001 Spec-First** | ⚠️ advisory | PRD/Tech-Spec 为回溯补齐；G0 在 R12 才升级为 machine-enforced |
| **G0: AI-002 测试先行** | ⚠️ advisory | 测试与代码同步交付，但非严格"红 → 绿"流程 |
| **G0: AI-003 越界检测** | ⚠️ advisory | 改动文件 basename 在 Tech-Spec 变更清单中 |
| **G0: AI-007 E2E 验收** | ⚠️ advisory | persona.e2e.test.ts 覆盖 AC-201~AC-217 |
| **G1: PRD** | ✅ | PRD 含 17 项 AC（正常/边界/错误三类） |
| **G3: Tech-Spec** | ✅ | persona-crud.tech.md D1-D8 共 8 条决策，每条含拒绝方案 + 代码绑定 |
| **G3.5: Spec-Binding** | ⚠️ | 本轮无 spec-binding 注释（spec-binding 机制在 R4 才引入） |
| **G4: 测试覆盖** | ✅ | contracts schema 单元测试 + persona-parser 单元测试 + persona.e2e 13 个用例 |
| **G5: `pnpm trinity`** | ✅ | typecheck + check-rules（22 项 enforcement）+ vitest 全绿 |
| **G6: check-rules.mjs** | ✅ | 22 项 enforcement 全过 |
| **G7: 代码审核** | ⚠️ | 详见 lessons-learned R2 教训（MODEL_REGISTRY 硬编码 + `as any` + `Math.random()`） |

---

## 2. G7 代码审核 — 逐文件审查

### 2.1 `scripts/seed.mjs`

| 方面 | 评估 |
|------|------|
| 批量同步 | ✅ 从 GitHub `alchaincyf/*-skill` 仓库抓取 SKILL.md，UPSERT 到 D1 |
| 错误兜底 | ✅ 单仓库超时 10s，不阻塞整体同步（AC-210） |
| 仓库不存在 | ✅ 跳过 + 记录错误（AC-208） |
| 网络断开 | ✅ 同步失败，打印错误日志退出（AC-213） |

### 2.2 `apps/api/schema.sql`

| 方面 | 评估 |
|------|------|
| personas 表 | ✅ 含 id/name/category/system_prompt/description/stargazers_count/created_at/updated_at |
| chat_records 表 | ✅ 含 id/user_id/persona_id/messages/created_at |
| 索引 | ✅ personas(id), chat_records(user_id, persona_id) |

### 2.3 `apps/api/src/domain/persona-parser.ts`

| 方面 | 评估 |
|------|------|
| `extractName()` | ✅ 从 markdown header 提取名称；无 header 返回 null（AC-216） |
| `extractSystemPrompt()` | ✅ 提取 System Prompt 段；缺失时取全文前 4000 字符（AC-209） |
| `extractDescription()` | ✅ 提取描述段；缺失返回空字符串 |
| 空输入 | ✅ extractName 返回 null，不抛异常（AC-215） |

### 2.4 `apps/api/src/service/persona-svc.ts`

| 方面 | 评估 |
|------|------|
| `batchSync()` | ✅ 调用 personaRepo.upsert，UPSERT 语义（AC-211） |
| 编排逻辑 | ✅ service → repo 调用，不直接操作 D1（D6） |

### 2.5 `apps/api/src/domain/llm.ts`

| 方面 | 评估 |
|------|------|
| **MODEL_REGISTRY 硬编码** | ❌ **违规 AI-005**：自建 `MODEL_REGISTRY` 字面量，无视 contracts 的 `builtinModelIds` + `modelConfigSchema`。详见 lessons-learned R2 教训 |
| **`as any` 类型断言** | ❌ **违规 CODE-001**：3 处 `as any`，应改为 Zod schema parse |
| **`Math.random()` 用于 ID** | ❌ **不安全**：应改用 `crypto.randomUUID()`（CF Workers 原生支持） |
| `callLLM()` | ✅ 调用 OpenAI 兼容 API；错误处理完备 |

### 2.6 `packages/contracts/test/persona.test.ts` + `chat.test.ts`

| 方面 | 评估 |
|------|------|
| Schema parse 正确性 | ✅ 合法输入 parse 成功 |
| 拒绝非法输入 | ✅ 缺字段/类型错/空字符串均抛 ZodError（AC-217） |

### 2.7 `apps/api/test/persona-parser.test.ts`

| 方面 | 评估 |
|------|------|
| extractName 边界 | ✅ 无 header、空字符串、null 输入 |
| extractSystemPrompt 边界 | ✅ 无 System Prompt 段 fallback 全文前 4000 字符 |

### 2.8 `apps/api/test/persona.e2e.test.ts`（R2 阶段）

| 方面 | 评估 |
|------|------|
| AC-205 健康检查 | ✅ curl /api/health → 200 |
| AC-206 persona 列表 | ✅ GET /api/personas 返回非空 |
| AC-207 check-rules | ✅ 22 项 enforcement 全过 |

> 注：POST/PUT/DELETE CRUD E2E 用例在 R3 阶段补齐（见 R3 review）

---

## 3. 问题清单

### 3.1 Bug

| ID | 文件 | 严重度 | 描述 |
|----|------|--------|------|
| (无活跃 Bug) | - | - | R2 交付时功能正确，问题在 R3 review 时已修复 |

### 3.2 规范/质量

| ID | 文件 | 严重度 | 描述 |
|----|------|--------|------|
| **S1** | `apps/api/src/domain/llm.ts` | 中 | MODEL_REGISTRY 硬编码违反 AI-005；SSOT 派生路径未走通。**后续 R3 修复**：删除 MODEL_REGISTRY，改用 contracts builtinModelIds 派生 |
| **S2** | `apps/api/src/domain/llm.ts` | 中 | 3 处 `as any` 违反 CODE-001。**后续 R3 修复**：改用 Zod schema parse |
| **S3** | `apps/api/src/domain/llm.ts` | 低 | `Math.random()` 生成 ID 不安全。**后续 R3 修复**：改用 `crypto.randomUUID()` |

---

## 4. 结论

**评审结论: APPROVED (回溯，含 3 项质量修复)**

### 总评

R2 完成了"人格域可运行验证"目标：批量同步脚本可用、种子数据写入 D1、后端可启动、22 项 enforcement 全过。CRUD 接口实现交由 R3（persona-crud.tech.md 覆盖）。

**关键贡献**:
- `scripts/seed.mjs` 批量同步管道
- `apps/api/schema.sql` 数据库 schema 定义
- contracts schema 单元测试 + persona-parser 单元测试
- 22 项 enforcement check-rules 全过

**已知问题（已在 R3 修复）**:
- S1 MODEL_REGISTRY 硬编码（违反 AI-005）
- S2 `as any` 类型断言（违反 CODE-001）
- S3 `Math.random()` 不安全 ID 生成

**批准状态**: 本轮回溯评估通过。S1/S2/S3 三项质量问题在 R3 修复完毕。
