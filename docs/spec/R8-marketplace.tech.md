# Tech-Spec: 人格市场 + 工坊 (Round 8)

> **角色**: Tech Lead | **状态**: 回溯补齐 | **对应 PRD**: R8-persona-marketplace.md

---

## 一、架构决策 (Dx)

| Dx | 决策 | 理由 | 代码绑定 |
|----|------|------|---------|
| **D14** | 列表统计用 LEFT JOIN + COALESCE，不在 personas 表冗余存储 | stats 数据源在 chat_records；聚合查询性能可接受 | `apps/api/src/repository/persona-repo.ts` → `findAllWithStats()` |
| **D15** | 预览接口 `POST /api/personas/preview` 不调用 personaRepo.findById，直接用传入 systemPrompt | 人格还不存在，无法通过 ID 查找 | `apps/api/src/service/chat-svc.ts` → `preview()`；`apps/api/src/router/persona.router.ts` |

### 拒绝方案

| 方案 | 拒绝理由 |
|------|---------|
| D14 alt A: 在 personas 表冗余 `like_rate` / `message_count` 列，评分时同步更新 | 评分变动需触发 personas 表 UPDATE，引入写放大与一致性风险（D11 已论证）。LEFT JOIN 在当前数据量（<10K 行）毫秒级返回，冗余收益不显著。 |
| D14 alt B: 单独建 `persona_stats` 物化视图表定时刷新 | D1 不支持物化视图，需应用层定时任务（cron trigger）增加运维负担。stats 与 personas 一一对应，无需独立表。 |
| D14 alt C: 前端聚合 — 多次调用 `/api/personas/:id/stats` | 列表页 N 次请求制造瀑布（N+1 问题），首屏延迟不可接受。后端 JOIN 一次返回是标准做法。 |
| D15 alt A: 先 `POST /api/personas` 创建草稿 persona 再 chat | 用户预览后未必保存，频繁创建产生垃圾数据；D1 写入成本（即使后续 DELETE）不必要。预览应是无副作用操作。 |
| D15 alt B: 复用 `POST /api/chats` 传完整 persona 对象（不存 ID） | 现有 chat 路由强依赖 personaId 加载 system prompt 和 tools，改造成本高且语义混乱。独立预览路由更清晰。 |
| D15 alt C: 客户端直接调用 LLM SDK（绕过后端） | 暴露 LLM API Key 给前端（违反 SEC-002），且失去流式聚合/可观测能力。预览必须经过后端。 |

---

## 二、数据模型变更

### personas 表
无新列——stats 通过 JOIN chat_records 实时聚合。

### 新建 PersonaSummary 类型
```typescript
// packages/contracts/src/schemas/persona.ts
export const personaSummarySchema = personaSchema.extend({
  likeRate: z.number(),
  messageCount: z.number(),
})
```

## 三、路由设计

| 方法 | 路径 | 变更 | Dx |
|------|------|------|----|
| GET | `/api/personas` | 增强 sort 参数 | D14 |
| GET | `/api/personas/hot` | 新增 | D14 |
| POST | `/api/personas/preview` | 新增 | D15 |

## 四、契约层变更

| Schema | 变更 |
|--------|------|
| `personaQuerySchema` | 新增 `sort?: 'popular' \| 'recent' \| 'rated'` |
| `personaSummarySchema` | 新建：Persona + likeRate + messageCount |

---

## 五、错误码定义

| 错误码 | HTTP | 场景 |
|--------|------|------|
| 1002 (VALIDATION_ERROR) | 400 | `sort` 参数非 `popular`/`recent`/`rated` 枚举值（AC-F1.1）；`POST /preview` 的 systemPrompt 为空字符串或纯空白（AC-F3.2） |
| 1001 (NOT_FOUND) | 404 | `GET /api/personas/hot` 在系统无人格时返回空数组（不报 404，符合 AC-F1.3） |
| 1004 (LLM_PREVIEW_ERROR) | 500 | 预览调用 LLM 失败（含超时、API Key 无效等）；不暴露原始错误，仅返回"预览失败" |

> 注：LLM_PREVIEW_ERROR (1004) 为本轮新增错误码，专用于预览路径（与流式 LLM_STREAM_ERROR 1003 区分语义）。

---

## 六、变更清单

### 新增文件

(无 — 所有改动均落到已有文件上)

### 修改文件

| 文件路径 | 变更内容 | 行数 |
|---------|---------|------|
| `packages/contracts/src/schemas/persona.ts` | 新增 `personaSummarySchema`；扩展 `personaQuerySchema` 加 `sort` 枚举 | - |
| `apps/api/src/repository/persona-repo.ts` | 新增 `findAllWithStats(sort)` 方法（LEFT JOIN + COALESCE + ORDER BY）；新增 `findHot(limit=10)` 方法 | ≤300 |
| `apps/api/src/service/persona-svc.ts` | 编排 `findAllWithStats()` 映射为 PersonaSummary；新增 `preview(systemPrompt, messages)` 调用 chat-svc 复用流式 LLM | ≤300 |
| `apps/api/src/router/persona.router.ts` | 新增 `GET /hot` + `POST /preview` 路由；`GET /` 路由增加 `sort` query 参数 Zod parse | ≤300 |
| `apps/api/test/persona.e2e.test.ts` | 新增 sort=popular/recent/rated 三类用例；新增 hot 接口测试；新增 preview 200/400 测试 | - |
| `apps/miniprogram/src/pages/index/index.js` | 三段式布局：热门横滚卡片 + 排序按钮 + 列表；`loadHot()` / `onSortTap()` 方法 | - |
| `apps/miniprogram/src/pages/index/index.wxml` | 热门区域 `wx:if` 守卫；排序按钮 active 态；卡片 `likeRate`/`messageCount` 显示 | - |
| `apps/miniprogram/src/pages/index/index.wxss` | 热门横滚样式 + 排序按钮 active 紫色 + 卡片统计样式 | - |
| `apps/web/src/pages/Home.tsx` | 同步 Web 端三段式布局；调用 `/api/personas?sort=` 渲染 PersonaSummary 卡片 | - |

### 删除文件

(无)

---

## 七、测试策略

| 测试类型 | 文件 | 覆盖功能 | AC |
|---------|------|---------|----|
| **E2E — 排序** | `apps/api/test/persona.e2e.test.ts` | `GET /api/personas?sort=popular`/`recent`/`rated` 三类排序；返回包含 likeRate+messageCount | AC-F1.1, AC-F1.2, AC-F1.3 |
| **E2E — 热门** | `apps/api/test/persona.e2e.test.ts` | `GET /api/personas/hot` 返回 ≤10 条；按权重排序 | AC-F2.1 |
| **E2E — 预览** | `apps/api/test/chat.e2e.test.ts` | `POST /api/personas/preview` 返回 200 + reply (R20)；空 systemPrompt 返回 400 (R21) | AC-F3.1, AC-F3.2 |
| **单元 — Stats 聚合** | `apps/api/test/persona.e2e.test.ts` | mock 80 like + 20 dislike → likeRate=0.8, messageCount=100 | AC-F1.1 边界 |
| **手动 — UI 验证** | 微信开发者工具 + 浏览器 | 三段式布局渲染；排序切换 active 态；热门横滚；卡片显示统计 | F1-F4 整体 |

### 关键测试场景

```
AC-F1.1 (sort=popular):
  ✓ persona A 有 80% 好评、persona B 有 60% 好评 → sort=popular 返回 [A, B]
  ✓ 每项含 likeRate (0-1) + messageCount (整数)

AC-F1.2 (sort=recent):
  ✓ B.created_at > A.created_at → sort=recent 返回 [B, A]

AC-F1.3 (sort=rated, 无人格):
  ✓ 数据库 personas 为空 → 返回 [] (200, 不报错)

AC-F2.1 (hot):
  ✓ 热门列表 ≤10 条
  ✓ 排序：权重 = likeRate * 0.6 + log(messageCount) * 0.4

AC-F3.1 (preview 成功):
  ✓ POST /preview {systemPrompt, messages} → 200 + {reply: "..."}
  ✓ 不写入 personas 表（验证无副作用）

AC-F3.2 (preview 空 systemPrompt):
  ✓ systemPrompt="" → 400 (VALIDATION_ERROR)
  ✓ systemPrompt="   " → 400 (空白也拒绝)
```

---

## 八、迁移/回滚方案

### 迁移步骤

1. **contracts 层先行**：在 `packages/contracts/src/schemas/persona.ts` 新增 `personaSummarySchema` + 扩展 `personaQuerySchema` 加 `sort` 枚举。发布 contracts 包后前端/后端均可消费类型。
2. **后端实现**：
   - `persona-repo.ts` 新增 `findAllWithStats()` + `findHot()`
   - `persona-svc.ts` 编排 + 新增 `preview()`
   - `persona.router.ts` 新增 `GET /hot` + `POST /preview` 路由
3. **前端适配**：
   - Web 端 `Home.tsx` 调用 `/api/personas?sort=` 渲染 PersonaSummary
   - 小程序 `pages/index/` 三段式布局改造
4. **无 D1 schema 变更**：本轮不涉及表结构变更（stats 通过 LEFT JOIN 实时聚合），无需 D1 迁移脚本。

### 回滚步骤

```bash
# 1. 通过 git revert 回滚应用代码
git revert <round-8-commit-hash>

# 2. 无需 D1 回滚 SQL（未变更表结构）
```

回滚影响：
- `personaSummarySchema` / `personaQuerySchema.sort` 类型删除后，前端 TypeScript 编译会报错（预期，需同步回滚前端）
- `GET /api/personas/hot` + `POST /api/personas/preview` 路由消失，前端调用返回 404（预期，需同步回滚前端）
- 已存在的 personas / chat_records 数据无影响（无 schema 变更）

### 回滚风险评估

低风险 — 纯增量功能（新增路由 + 新增 schema 字段），无破坏性变更。前端回滚后行为退化为 R7 状态（无排序、无热门、无预览）。

---

## 九、审计回溯注记 (2026-07-06)

> **触发**：2026-07-06 文档完整性审计发现本 Tech-Spec 第六节"修改文件"表格中 3 个小程序文件路径缺 `src/` 前缀，与实际路径 `apps/miniprogram/src/pages/index/index.{js,wxml,wxss}` 不一致，导致 AI-003 越界检测会判定文件不存在。
>
> **修复**：将 3 行路径从 `apps/miniprogram/pages/index/` 修正为 `apps/miniprogram/src/pages/index/`。同时补充第八节"迁移/回滚方案"段落（原缺失，违反 G3 门禁 Tech-Spec 7 项段落齐全要求）。
>
> **门禁状态**：G3 Tech-Spec 段落完整性 ✅ | AI-003 越界检测路径准确性 ✅
