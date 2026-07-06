# 回溯 Spec: R3-R6 文档缺口说明

> **角色**: Tech Lead (回溯) | **状态**: 文档缺口回溯说明 | **触发**: 2026-07-06 文档完整性审计发现 R3-R6 缺独立 PRD/Tech-Spec
> **目的**: 说明 R3-R6 在 AI-001 advisory 期间未独立产出 PRD/Tech-Spec 的历史背景，记录各轮实际范围与产物，作为 Spec-First 流程合规的回溯闭环。

---

## 一、背景

PersonaChat 项目在 R1-R6 期间，AI-001 (Spec-First) 规则标注为 `[advisory]`，未 machine-enforced。R3-R6 因以下原因未独立产出 PRD/Tech-Spec：

1. **R3 与 R2 合并交付**：R3 是 R2 的延续（CRUD 接口补齐 + R2 遗留修复），当时视为同一需求的两阶段实现
2. **R4-R6 为小型重构/优化轮**：单轮改动 < 5 文件，Tech Lead 判断"无需独立 Spec"
3. **AI-001 advisory 期间无强制门禁**：check-rules.mjs 在 R12 才将 AI-001 升级为 machine-enforced

R7-R10 重蹈此覆辙（4 轮流程违规），但事后通过 retro 补齐了 PRD/Tech-Spec。R3-R6 因改动更小、时间更早， retro 时仅补齐了 review 报告，未补齐 PRD/Tech-Spec。

---

## 二、各轮实际范围与产物

### R3: Persona CRUD 接口 + R2 遗留修复 + TDD 雏形

**实际范围**：
1. Persona CRUD 接口（POST/PUT/DELETE）+ Zod 入口校验
2. 修复 R2 遗留质量问题：MODEL_REGISTRY 硬编码 / 3 处 as any / Math.random() ID 生成
3. 引入 Superpowers TDD 雏形（红→绿流程）
4. 引入 Spec-Binding 注释雏形（D#: 格式，R4 修正 regex）

**Spec 覆盖**：
- PRD：复用 `docs/prd/R2-persona-domain-complete.md`（R2/R3 合并需求）
- Tech-Spec：`docs/spec/persona-crud.tech.md` D1-D8（覆盖 R2/R3 CRUD 部分）
- Review：`docs/review/R3-persona-stats-review.md`
- Retro：`docs/retro/round-3.md`
- Delta：`docs/round-3-delta.md`

**为何无需独立 PRD/Tech-Spec**：R2 PRD 的 AC 清单已包含 CRUD 全部 12 条用例（P1-P12），persona-crud.tech.md 的 D1-D8 决策覆盖 create/update/delete 三个端点。独立产出 R3 PRD 会与 R2 重复。

---

### R4: Chat DELETE + Spec-Binding 引入 + 前端 SSOT

**实际范围**：
1. Chat DELETE 路由（`DELETE /api/chats/:id`）
2. **Spec-Binding 机制引入**（D1-D7 注释 + `scripts/check-spec-binding.mjs` 脚本）
3. 前端 SSOT：`GET /api/models` 后端下发模型列表，前端动态获取 + local fallback

**Spec 覆盖**：
- PRD：无（R4 无独立 PRD）
- Tech-Spec：无独立 Tech-Spec；Spec-Binding 机制本身是本轮产物
- Review：`docs/review/R4-spec-binding-review.md`
- Retro：`docs/retro/round-4.md`
- Delta：`docs/round-4-delta.md`

**为何当时无独立 PRD/Tech-Spec**：
- Chat DELETE 是单端点补齐，复用 R3 的 chat domain schema
- Spec-Binding 机制是工具层产物（脚本 + 注释格式），不属于业务功能
- 前端 SSOT 是 AI-005 修复，contracts 已定义 SSOT，前端只需对接

**回溯评估**：Spec-Binding 机制作为工具产物，本可不需要业务 PRD；但前端 SSOT 涉及 API 设计变更（新增 GET /api/models），事后看应补 Tech-Spec D 决策记录"为何选择 API 下发而非硬编码"。L21 教训（R10 前端视觉零防御）部分根因可追溯到此。

---

### R5: 前端历史分页 + 删除功能

**实际范围**：
1. 前端 history 页下拉刷新 + 触底加载分页（小程序 + Web）
2. 前端历史记录删除功能（长按/滑删 + 确认对话框）
3. `ChatApi.deleteRecord` 客户端方法同步扩展（小程序 + Web）

**Spec 覆盖**：
- PRD：无
- Tech-Spec：无
- Review：`docs/review/R5-frontend-pagination-review.md`
- Retro：`docs/retro/round-5.md`
- Delta：`docs/round-5-delta.md`

**为何当时无独立 PRD/Tech-Spec**：
- 纯前端优化，后端无改动（DELETE 端点 R4 已实现）
- 分页是 UI 体验改进，AC 难以量化（"分页流畅"、"加载完成停止"）
- 前端无单元测试（L21 教训：apps/web 直到 R12 才有测试）

**回溯评估**：前端体验优化也应记入 PRD（即使 AC 主观），以便后续 Reviewer 核对。R12 升级 FRONTEND-001/002 为 machine-enforced 后，前端改动必须有测试，间接强制了 PRD 必要性。

---

### R6: Spec-Binding 收尾 + 复盘反推机制补齐

**实际范围**：
1. Spec-Binding D8 漂移修复（代码引用 D8 但 persona-crud.tech.md 无此决策 → 补充 D8）
2. Spec-Binding 机制收尾完善（check-spec-binding.mjs 全过）
3. 复盘反推机制补齐（`docs/retro/lessons-learned.md` 首次整理，反推 META-005 规则）

**Spec 覆盖**：
- PRD：无
- Tech-Spec：在 `docs/spec/persona-crud.tech.md` 中补充 D8 决策（修复"幽灵引用"）
- Review：`docs/review/R6-spec-binding-cleanup-review.md`
- Retro：`docs/retro/round-6.md`
- Delta：`docs/round-6-delta.md`

**为何当时无独立 PRD/Tech-Spec**：
- D8 补充是 1 行 Spec 改动（在 persona-crud.tech.md 加一行决策）
- 复盘机制补齐是元工作（meta-work），不属于业务功能
- Spec-Binding 收尾是工具维护

**回溯评估**：R6 实质上修改了 persona-crud.tech.md（补 D8），严格说应有 backrefactor Spec 记录此修改。本文件即作为 R6 的回溯 Spec 补齐。

---

## 三、变更清单（相对原各轮）

R3-R6 的实际源码变更已在各轮 Review 报告 "G7 代码审核" 段记录。本回溯 Spec 不重复列举，仅声明：

| 轮次 | 主要变更文件 | 已在 Review 报告核对 |
|------|------------|---------------------|
| R3 | persona.ts / persona-repo.ts / persona-svc.ts / persona.router.ts / llm.ts / *.test.ts | ✅ R3 review §2 |
| R4 | chat.router.ts / check-spec-binding.mjs / server.ts / client.js / client.ts | ✅ R4 review §2 |
| R5 | apps/miniprogram history.* / apps/web History.tsx / client.js / client.ts | ✅ R5 review §2 |
| R6 | persona-crud.tech.md (补 D8) / lessons-learned.md (首次整理) | ✅ R6 review §2 |

---

## 四、门禁状态（回溯评估）

| 门禁 | R3 | R4 | R5 | R6 | 说明 |
|------|----|----|----|----|------|
| G0 AI-001 Spec-First | ⚠️ advisory | ⚠️ advisory | ⚠️ advisory | ⚠️ advisory | 当时 advisory，R12 升级 machine-enforced |
| G0 AI-002 测试先行 | ✅ | ⚠️ | ⚠️ | ⚠️ | R3 引入 TDD；R4-R6 测试数不变 |
| G1 PRD | ✅ 复用 R2 | ❌ | ❌ | ❌ | 本回溯 Spec 补齐说明 |
| G3 Tech-Spec | ✅ persona-crud | ❌ | ❌ | ⚠️ 补 D8 | 本回溯 Spec 补齐说明 |
| G3.5 Spec-Binding | ⚠️ 雏形 | ✅ 引入 | ✅ 保持 | ✅ 收尾 | R4 引入机制，R6 闭环 |
| G4 测试覆盖 | ✅ 48 tests | ✅ 48 | ✅ 48 | ✅ 48 | 全过 |
| G7 代码审核 | ✅ | ✅ | ✅ | ✅ | 全过 |

---

## 五、反推与预防

### 教训反推

1. **advisory 规则不可靠**（L22 已记入）：AI-001 advisory 期间 R3-R6 + R7-R10 共 7 轮跳过 Spec-First。R12 升级为 machine-enforced 后此问题不再发生。
2. **小型重构轮也需 Spec**：即使改动 < 5 文件，也应写 backrefactor Spec 记录"改了什么 + 为什么改"。本文件即为此模式的范例。
3. **合并交付应显式声明**：R2/R3 合并交付应在 R2 PRD 中明确标注"含 R3 CRUD 接口"，避免事后追溯困难。

### 预防措施

| 措施 | 落地状态 | 说明 |
|------|---------|------|
| AI-001 machine-enforced | ✅ R12 落地 | check-rules.mjs G0 分支 |
| 重构场景 backrefactor Spec 模板 | ✅ 本文件 + R12 偏离回溯 | 作为后续轮次范例 |
| 合并交付显式声明 | ⚠️ 待落实 | 后续 PRD 模板加 "合并轮次" 字段 |
| 前端改动必须有测试 | ✅ R12 落地 | FRONTEND-001/002 machine-enforced |

---

## 六、结论

R3-R6 文档缺口是 AI-001 advisory 期间的历史遗留，已在 R12 升级为 machine-enforced 后结构性消除。本回溯 Spec 作为补齐说明，记录各轮实际范围、Spec 覆盖情况、当时无独立 PRD/Tech-Spec 的原因，以及反推预防措施。

**评审结论**: APPROVED — 文档缺口已说明，反推措施已落地，不再发生。
