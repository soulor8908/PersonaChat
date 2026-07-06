# Round 3 评审报告: Persona CRUD 接口 + Superpowers TDD + Spec-Binding 雏形

> **评审角色**: Reviewer
> **评审日期**: 2026-07-05
> **对应 PRD**: 复用 `docs/prd/R2-persona-domain-complete.md`（R2/R3 合并）
> **对应 Tech-Spec**: `docs/spec/persona-crud.tech.md`（覆盖 R2/R3 CRUD 部分）
> **范围**: CRUD 接口（POST/PUT/DELETE）+ 修复 R2 遗留质量问题（MODEL_REGISTRY/as any/Math.random）+ 引入 Superpowers TDD 工作流雏形 + 引入 Spec-Binding 注释雏形
> **状态**: 回溯补齐

---

## 1. 门禁通过状态

| Gate | 状态 | 说明 |
|------|------|------|
| **G0: AI-001 Spec-First** | ⚠️ advisory | Tech-Spec persona-crud.tech.md 覆盖；G0 在 R12 才升级为 machine-enforced |
| **G0: AI-002 测试先行** | ✅ | R3 引入 Superpowers TDD 雏形：测试用例（红）→ 实现（绿） |
| **G0: AI-003 越界检测** | ⚠️ advisory | 改动文件 basename 在 Tech-Spec 变更清单中 |
| **G0: AI-007 E2E 验收** | ✅ | persona.e2e.test.ts 13 个 CRUD 用例覆盖 P1-P12 AC |
| **G1: PRD** | ✅ | 复用 R2 PRD，AC 清单完整 |
| **G3: Tech-Spec** | ✅ | persona-crud.tech.md D1-D8 共 8 条决策，每条含拒绝方案 + 代码绑定 |
| **G3.5: Spec-Binding** | ⚠️ | R3 引入 `D#:` 注释雏形；R4 修正 regex 兼容性 |
| **G4: 测试覆盖** | ✅ | 测试数 22→48（新增 13 个 CRUD E2E + persona-parser 边界 + chat-svc 单元） |
| **G5: `pnpm trinity`** | ✅ | typecheck + check-rules + vitest 全绿 |
| **G6: check-rules.mjs** | ✅ | 22 项 enforcement 全过 |
| **G7: 代码审核** | ⚠️ | 详见下文 — Mock D1 params offset 错误 + Rate-limit 全局 Map 累积 + `updated!` 非空断言 |

---

## 2. G7 代码审核 — 逐文件审查

### 2.1 `packages/contracts/src/schemas/persona.ts`

| 方面 | 评估 |
|------|------|
| `personaCreateSchema` (D1/D2) | ✅ Omit<id/createdAt/updatedAt/stargazersCount>；stargazersCount 固定 0 |
| `personaUpdateSchema` (D1/D3) | ✅ 全字段可选 + `.refine()` 拒绝空对象 |
| `personaIdSchema` (D7) | ✅ z.string().min(1) 用于路由参数 |

### 2.2 `apps/api/src/repository/persona-repo.ts`

| 方面 | 评估 |
|------|------|
| `create(input)` (D5) | ✅ 独立原子操作，不重用 upsert |
| `update(id, input)` (D5) | ✅ 部分更新；参数化绑定（D4） |
| `delete(id)` (D8) | ✅ 先 findById 再 DELETE，不存在抛 NOT_FOUND |
| SQL 参数化 | ✅ 全部使用 `db.prepare(sql).bind(...params)`（D4，SEC-003） |

### 2.3 `apps/api/src/service/persona-svc.ts`

| 方面 | 评估 |
|------|------|
| 编排逻辑 (D6) | ✅ 调用 contracts Zod parse → repo → 错误码映射 |
| 不直接构造 SQL | ✅ service → repo 单向调用（ARCH-001） |

### 2.4 `apps/api/src/router/persona.router.ts`

| 方面 | 评估 |
|------|------|
| `POST /` (create) | ✅ personaCreateSchema.parse() 入口校验（D7，SEC-003） |
| `PUT /:id` (update) | ✅ personaUpdateSchema.parse() + personaIdSchema |
| `DELETE /:id` (delete) | ✅ personaIdSchema + 调用 service |

### 2.5 `apps/api/src/domain/llm.ts`（R2 遗留修复）

| 方面 | 评估 |
|------|------|
| **MODEL_REGISTRY 修复** | ✅ 删除硬编码，改用 contracts `builtinModelIds` + `modelConfigSchema` 派生 |
| **`as any` 修复** | ✅ 3 处 `as any` 改为 Zod schema parse |
| **`Math.random()` 修复** | ✅ 改用 `crypto.randomUUID()` |

### 2.6 `apps/api/test/persona.e2e.test.ts`（R3 新增 CRUD 用例）

| 方面 | 评估 |
|------|------|
| P1 Create 成功 | ✅ POST 201 + 返回 id/createdAt/updatedAt + stargazersCount=0 |
| P2 Create 字段缺失 | ✅ POST 400 (VALIDATION_ERROR) |
| P3 Create 重复 | ✅ POST 409 |
| P4 Read 列表/单个 | ✅ GET 200 |
| P5 Read 不存在 | ✅ GET 404 (NOT_FOUND) |
| P6 Update 部分字段 | ✅ PUT 200 |
| P7 Update 不存在 | ✅ PUT 404 |
| P8 Update 空对象 | ✅ PUT 400 (refine 拒绝) |
| P9 Update 字段类型错 | ✅ PUT 400 |
| P10 Delete 成功 | ✅ DELETE 204 + 后续 GET 404 |
| P11 Delete 不存在 | ✅ DELETE 404 (D8 先查存在性) |
| P12 Delete 后 GET 验证 | ✅ DELETE 后 GET 返回 404 |

### 2.7 `apps/api/test/chat-svc.test.ts`（R3 新增）

| 方面 | 评估 |
|------|------|
| chat service 单元 | ✅ mock D1 + callLLM |
| Mock D1 params offset | ❌ **Bug**：UPDATE handler params offset 错误，SET 与 WHERE 子句索引混合（详见 lessons-learned R3） |

---

## 3. 问题清单

### 3.1 Bug

| ID | 文件 | 严重度 | 描述 |
|----|------|--------|------|
| (无活跃 Bug) | - | - | R3 交付时 Mock D1 params offset 问题在测试工具层，已修复 |

### 3.2 规范/质量

| ID | 文件 | 严重度 | 描述 |
|----|------|--------|------|
| **S1** | `apps/api/src/repository/chat-repo.ts` | 中 | **Mock D1 UPDATE handler params offset 错误** — SET 与 WHERE 子句参数索引混合。教训：测试工具本身应该有测试。详见 lessons-learned R3 |
| **S2** | `apps/api/src/middleware/rate-limit.ts` | 中 | **Rate-limit 全局 Map 在 E2E 测试间累积请求计数**，导致 chat E2E 命中限流返回 401。教训：状态中间件不应影响 E2E 测试，应 mock 或跳过 |
| **S3** | `apps/api/src/repository/chat-repo.ts` | 低 | **`updated!` 非空断言** 是 CODE-001 精神违规。修复：用 `if (!updated) throw Errors.internal(...)` 替代 |

### 3.3 Spec-Binding 雏形

| ID | 文件 | 严重度 | 描述 |
|----|------|--------|------|
| **SB1** | `apps/api/src/**/*.ts` | 低 | R3 引入 `D#:` 注释雏形（D1-D8 共 8 个决策），但格式与 regex `(?:\s\|$)` 不兼容——冒号后跟中文导致无法匹配。**R4 修复**：regex 改为 `(?::\|\s\|$)` |

---

## 4. 结论

**评审结论: APPROVED (回溯，含 3 项质量教训)**

### 总评

R3 完成"Persona CRUD 接口 + 修复 R2 遗留质量问题 + 引入 TDD/Spec-Binding 雏形"三个目标。CRUD 接口 13 个用例 100% 通过 P1-P12 AC。R2 遗留的 3 项质量问题（MODEL_REGISTRY/as any/Math.random）全部修复。

**关键贡献**:
- 完整 Persona CRUD 接口（POST/PUT/DELETE）
- 修复 R2 三项 AI-005/CODE-001 违规
- 测试数 22→48，新增 26 个用例
- 引入 Superpowers TDD 雏形 + Spec-Binding 注释雏形（为 R4 完整机制奠基）

**已知问题（已在 R4 修复）**:
- S1 Mock D1 params offset 错误（测试工具层）
- S2 Rate-limit 全局 Map 累积（中间件层）
- S3 `updated!` 非空断言（CODE-001 精神违规）
- SB1 Spec-Binding regex 不兼容中文（R4 修复）

**批准状态**: 本轮回溯评估通过。三项质量教训反推到 lessons-learned。
