# Round 4 评审报告: Chat DELETE + Spec-Binding 引入 + 前端 SSOT

> **评审角色**: Reviewer
> **评审日期**: 2026-07-05
> **对应 PRD**: 无（R4 无独立 PRD，参考 `docs/retro/round-4.md`）
> **对应 Tech-Spec**: 无独立 Tech-Spec；Spec-Binding 机制本身是本轮产物
> **范围**: (1) Chat DELETE 路由 (2) Spec-Binding 机制引入（D1-D7 注释 + check-spec-binding.mjs 脚本）(3) 前端 SSOT：`GET /api/models` 下发模型列表
> **状态**: 回溯补齐

---

## 1. 门禁通过状态

| Gate | 状态 | 说明 |
|------|------|------|
| **G0: AI-001 Spec-First** | ⚠️ advisory | 无独立 PRD/Tech-Spec；R4 的 Spec-Binding 机制是产物而非前置 |
| **G0: AI-002 测试先行** | ⚠️ advisory | 测试数保持 48 不变（chat DELETE 已在 R3 覆盖，前端 SSOT 测试用 E2E 验证） |
| **G0: AI-003 越界检测** | N/A | 无 Tech-Spec 变更清单 |
| **G0: AI-007 E2E 验收** | ⚠️ advisory | chat DELETE 用例已在 R3 e2e 中 |
| **G1: PRD** | ❌ | R4 无独立 PRD |
| **G3: Tech-Spec** | ❌ | R4 无独立 Tech-Spec |
| **G3.5: Spec-Binding** | ✅ | **本轮引入 spec-binding 机制**：D1-D7 注释 + check-spec-binding.mjs 脚本 |
| **G4: 测试覆盖** | ✅ | 测试数 48/48 不变；前端 SSOT 通过 `GET /api/models` 集成验证 |
| **G5: `pnpm trinity`** | ✅ | typecheck + check-rules + vitest 全绿 |
| **G6: check-rules.mjs** | ✅ | 22 项 enforcement 全过 |
| **G7: 代码审核** | ⚠️ | 详见下文 — Spec-Binding regex 中文兼容性问题 + 前端硬编码 modelKeys |

---

## 2. G7 代码审核 — 逐文件审查

### 2.1 `apps/api/src/router/chat.router.ts`（Chat DELETE）

| 方面 | 评估 |
|------|------|
| `DELETE /api/chats/:id` | ✅ 调用 chatRepo.delete；Zod parse 入口校验 |
| 404 处理 | ✅ 不存在抛 NOT_FOUND |
| 错误码映射 | ✅ error-handler 转为 404 响应 |

### 2.2 Spec-Binding 机制引入

| 方面 | 评估 |
|------|------|
| `D#:` 注释格式 | ⚠️ R3 引入的 `D#:` 格式与 check-spec-binding.mjs 的 regex `(?:\s\|$)` 不兼容——冒号后直接跟中文导致无法匹配 |
| **regex 修复** | ✅ 改为 `(?::\|\s\|$)` 兼容中文；详见 lessons-learned R4 |
| D1-D7 注释 | ✅ 7 个决策首次完整标注到代码 |
| 双向绑定 | ✅ Spec ↔ Code 双向追溯 |

### 2.3 `scripts/check-spec-binding.mjs`（新增）

| 方面 | 评估 |
|------|------|
| 扫描源文件 | ✅ 遍历 `apps/api/src/**/*.ts` + `packages/contracts/src/**/*.ts` |
| regex 匹配 | ✅ `D(\d+)` 注释提取 + Spec 文件中 Dx 表格交叉验证 |
| 漂移检测 | ✅ 代码引用了 Spec 中不存在的 Dx → 报错 |
| 报告输出 | ✅ 列出未绑定文件 + 漂移决策 |

### 2.4 前端 SSOT：`GET /api/models`

| 方面 | 评估 |
|------|------|
| `apps/api/src/server.ts` 新增 `/api/models` | ✅ 从 contracts `builtinModelIds` + `modelConfigSchema` 派生下发 |
| 前端 `apps/miniprogram/src/api/client.js` | ⚠️ **R4 之前**：硬编码 `modelKeys: ['deepseek-v3', ...]`，与 contracts 不同步。**R4 修复**：改用动态 `GET /api/models` + local fallback |
| 前端 `apps/web/src/api/client.ts` | ✅ R4 同步引入动态获取 |

### 2.5 `apps/api/test/chat.e2e.test.ts`（chat DELETE 用例）

| 方面 | 评估 |
|------|------|
| DELETE 成功 | ✅ DELETE 200/204 |
| DELETE 不存在 | ✅ DELETE 404 |
| 权限校验 | ⚠️ SEC-001 advisory — 当前无鉴权 |

---

## 3. 问题清单

### 3.1 Bug

| ID | 文件 | 严重度 | 描述 |
|----|------|--------|------|
| (无活跃 Bug) | - | - | - |

### 3.2 规范/质量

| ID | 文件 | 严重度 | 描述 |
|----|------|--------|------|
| **S1** | `scripts/check-spec-binding.mjs` | 中 | regex `(?:\s\|$)` 与 `D#:` 后跟中文不兼容。**R4 修复**：改为 `(?::\|\s\|$)` |
| **S2** | `apps/miniprogram/src/api/client.js` (R4 前) | 中 | 前端硬编码 `modelKeys` 与 contracts 不同步。**R4 修复**：改用 `GET /api/models` 动态获取 |
| **S3** | R4 流程 | 低 | R4 无独立 PRD/Tech-Spec，依赖 retro 推断。后续 R7-R10 重蹈此覆辙 |

---

## 4. 结论

**评审结论: APPROVED (回溯，含 2 项质量修复)**

### 总评

R4 完成三个目标：(1) Chat DELETE 路由补齐 (2) **Spec-Binding 机制从 0→7 决策的质的飞跃** (3) 前端 SSOT — 模型列表从硬编码改为 API 下发。Spec-Binding 机制是本轮最大贡献，为后续 R6 的 Spec-Binding 收尾和 R11 的 G3.5 门禁奠基。

**关键贡献**:
- `scripts/check-spec-binding.mjs` 首次实现 Spec ↔ Code 双向追溯
- D1-D7 共 7 个决策首次完整标注到代码
- `GET /api/models` 后端 SSOT 下发
- 前端 modelKeys 从硬编码改为 API 获取 + local fallback

**已知问题（已在 R4 内修复）**:
- S1 Spec-Binding regex 中文不兼容（已修复）
- S2 前端硬编码 modelKeys（已修复）

**反推**:
- 应增加 FRONTEND-001 规则"前端可变集合从 API 获取，不硬编码"（R11/R12 落地）
- BA 应明确"API 端点应包含列表配置下发端点"

**批准状态**: 本轮回溯评估通过。
