# Tech-Spec: Persona CRUD (Round 2/3)

> **角色**: Tech Lead | **状态**: 回溯补齐 | **对应 PRD**: R2-persona-domain-complete.md
>
> **覆盖范围说明**: 原 PRD 引用误写为 "R3-persona-crud"，实际对应 PRD 为 `docs/prd/R2-persona-domain-complete.md`。本 Spec 覆盖 R2（人格域完整实现）+ R3（CRUD 接口扩展）两轮的 CRUD 实现部分。R2 的批量同步脚本和 seed 数据不在本 Spec 范围。

---

## 一、架构决策 (Dx)

| Dx | 决策 | 理由 | 拒绝方案 | 代码绑定 |
|----|------|------|---------|---------|
| **D1** | 输入 Schema 与实体 Schema 分离：personaCreateSchema / personaUpdateSchema 独立于 personaSchema | 实体含 id/createdAt/updatedAt/stargazersCount 等系统生成字段，不应暴露给客户端输入 | 复用 personaSchema 并标记部分字段 optional — 语义不清晰，容易误用 | `packages/contracts/src/schemas/persona.ts` |
| **D2** | create 不包含 stargazersCount（默认 0） | stargazersCount 由 sync 管道同步 GitHub stars，手动创建应固定为 0 | 允许传入 stargazersCount — 破坏数据一致性 | `packages/contracts/src/schemas/persona.ts` → personaCreateSchema |
| **D3** | update 全部字段可选，至少一个（`.refine()` 校验） | 部分更新语义，客户端只需传要改的字段 | 全部字段必填（PUT 语义）— 增加客户端负担 | `packages/contracts/src/schemas/persona.ts` → personaUpdateSchema |
| **D4** | Repository 层使用参数化 D1 绑定 (`db.prepare(sql).bind(...params)`) | 防止 SQL 注入，D1 不推荐字符串拼接（SEC-003） | 字符串拼接 SQL — 安全风险 | `apps/api/src/repository/persona-repo.ts` |
| **D5** | create/update/delete 独立原子操作（不重用 upsert） | upsert 用于 sync 场景（INSERT OR UPDATE），create/update 语义不同 | 统一使用 upsert — create 重复调用会覆盖已有数据 | `apps/api/src/repository/persona-repo.ts` |
| **D6** | 业务层只编排，不做数据库操作（service → repo 调用） | ARCH-001 依赖方向要求 service → repo，数据库访问封装在 repo | service 直接操作 D1 — 违反分层架构 | `apps/api/src/service/persona-svc.ts` |
| **D7** | 所有路由入口 Zod 校验（`.parse()` 严格模式） | 输入校验在路由层完成，下层可信任数据（SEC-003） | 用 TypeScript 类型断言跳过校验 — 不安全 | `apps/api/src/router/persona.router.ts` |
| **D8** | delete 操作先查存在性再删除，不存在则抛 NOT_FOUND | 与其他 CRUD 语义一致，给客户端明确的 404 反馈 | 直接 delete 不查存在性 — 无法区分"成功删除"和"本来就不存在" | `apps/api/src/repository/persona-repo.ts` → `delete()` |

---

## 二、contracts 变更

| Schema | 变更 | Dx |
|--------|------|----|
| `personaSchema` | 已存在（R1 创建），本轮作为基类不变 | - |
| `personaCreateSchema` | **新建**：personaSchema 的 Omit<id, createdAt, updatedAt, stargazersCount> 版本；stargazersCount 固定为 0（D2） | D1, D2 |
| `personaUpdateSchema` | **新建**：所有业务字段可选 + `.refine(data => Object.keys(data).length > 0, "至少一个字段")`（D3） | D1, D3 |
| `personaIdSchema` | **新建**：z.string().min(1) 用于路由参数校验 | D7 |

---

## 三、错误码定义

| 错误码 | HTTP | 场景 |
|--------|------|------|
| 1001 (NOT_FOUND) | 404 | `GET /api/personas/:id` persona 不存在；`PUT /api/personas/:id` 更新目标不存在；`DELETE /api/personas/:id` 删除目标不存在（D8） |
| 1002 (VALIDATION_ERROR) | 400 | `POST /api/personas` 输入未通过 personaCreateSchema.parse（缺字段/类型错/空字符串）；`PUT /api/personas/:id` 输入未通过 personaUpdateSchema.parse 或 refine "至少一个字段" 失败；`POST` 重复创建（id 已存在） |
| 5000 (INTERNAL_ERROR) | 500 | D1 写入失败；事务回滚；网络异常 |

> 无新增错误码（沿用 R1 已定义的 1001/1002/5000 三类）。

---

## 四、变更清单

### 新增文件

| 文件路径 | 功能 | Dx |
|---------|------|----|
| `apps/api/test/persona.e2e.test.ts` | 13 个 Given/When/Then CRUD 场景（P1-P12 AC + 1 个边界） | D5-D8 |

### 修改文件

| 文件路径 | 变更内容 | 行数 |
|---------|---------|------|
| `packages/contracts/src/schemas/persona.ts` | 新增 personaCreateSchema（D1/D2）；新增 personaUpdateSchema（D1/D3）；新增 personaIdSchema（D7） | ≤300 |
| `apps/api/src/repository/persona-repo.ts` | 新增 `create(input)` / `update(id, input)` / `delete(id)` 方法；delete 内部先 `findById` 再 DELETE（D8）；所有 SQL 参数化绑定（D4） | ≤300 |
| `apps/api/src/service/persona-svc.ts` | 编排 create/update/delete：调用 contracts Zod parse → repo → 错误码映射；不直接构造 SQL（D6） | ≤300 |
| `apps/api/src/router/persona.router.ts` | 新增 `POST /`（create）；`PUT /:id`（update）；`DELETE /:id`（delete）；路由入口 Zod parse（D7） | ≤300 |

### 删除文件

(无)

---

## 五、测试策略

| 测试类型 | 文件 | 覆盖功能 | AC |
|---------|------|---------|----|
| **Schema 单元测试** | `packages/contracts/test/persona.test.ts` | personaCreateSchema 拒绝 id/createdAt/stargazersCount 字段；personaUpdateSchema 接受部分字段；refine 拒绝空对象 | D1, D2, D3 |
| **E2E — Create** | `apps/api/test/persona.e2e.test.ts` | POST 200 创建成功；POST 400 字段缺失；POST 409 重复 id；POST 不接受 stargazersCount | P1-P3 + AC-F2.1 |
| **E2E — Read** | `apps/api/test/persona.e2e.test.ts` | GET 列表 200；GET 单个 200；GET 不存在 404 | P4-P5 |
| **E2E — Update** | `apps/api/test/persona.e2e.test.ts` | PUT 200 部分字段更新；PUT 404 不存在；PUT 400 空对象；PUT 400 字段类型错 | P6-P9 |
| **E2E — Delete** | `apps/api/test/persona.e2e.test.ts` | DELETE 204 删除成功；DELETE 404 不存在；DELETE 后 GET 返回 404 验证 | P10-P12 |
| **AI-007 验收** | `apps/api/test/persona.e2e.test.ts` | 覆盖 P1-P12 全部 AC（正常/边界/错误三类路径） | 全部 |

### 关键测试场景

```
P1 (Create 成功):
  ✓ POST /api/personas {name, category, system_prompt, ...} → 201 + {id, ...}
  ✓ 返回的 persona 对象包含 id/createdAt/updatedAt（系统生成）
  ✓ stargazersCount=0（D2，不接受客户端传入）

P2 (Create 字段缺失):
  ✓ POST 缺少 name → 400 (VALIDATION_ERROR)
  ✓ POST 缺少 category → 400
  ✓ POST system_prompt 为空字符串 → 400

P3 (Create 重复):
  ✓ 已存在 id="karpathy" → 再 POST 同 id → 409 (VALIDATION_ERROR)

P5 (Read 不存在):
  ✓ GET /api/personas/nonexistent-id → 404 (NOT_FOUND)

P8 (Update 空对象):
  ✓ PUT /api/personas/karpathy {} → 400 (refine 拒绝空对象，D3)

P10 (Delete 成功):
  ✓ DELETE /api/personas/karpathy → 204 No Content
  ✓ 后续 GET /api/personas/karpathy → 404（D8 验证）

P11 (Delete 不存在):
  ✓ DELETE /api/personas/nonexistent-id → 404 (D8 先查存在性)
```

---

## 六、迁移/回滚方案

**无 schema 变更，无需迁移。**

R2/R3 的 CRUD 实现完全基于 R1 已创建的 `personas` 表（见 `apps/api/schema.sql`），未引入新列或新表。所有变更仅涉及 contracts / repository / service / router 四层代码。

### 回滚步骤

```bash
# 1. 通过 git revert 回滚应用代码
git revert <persona-crud-commit-hash>

# 2. 数据无需回滚（CRUD 操作产生的 personas 行由用户决定是否保留）
#    如需清理本 Spec 引入的测试数据：
#    DELETE FROM personas WHERE id IN ('test-persona-1', 'test-persona-2', ...);
```

回滚影响：
- 旧版路由无 POST/PUT/DELETE 方法 → 客户端调用返回 404（前端需同步回滚到只读模式）
- 已创建的 personas 数据保留（CRUD 操作有副作用，但数据本身有价值，不强制清理）
- contracts 层的 personaCreateSchema/personaUpdateSchema 仍可被 sync 管道等场景复用，不强制回滚
