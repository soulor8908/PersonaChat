# Tech-Spec: 人格市场 + 工坊 (Round 8)

> **角色**: Tech Lead | **状态**: 回溯补齐 | **对应 PRD**: R8-persona-marketplace.md

---

## 一、架构决策 (Dx)

| Dx | 决策 | 理由 | 代码绑定 |
|----|------|------|---------|
| **D14** | 列表统计用 LEFT JOIN + COALESCE，不在 personas 表冗余存储 | stats 数据源在 chat_records；聚合查询性能可接受 | `repository/persona-repo.ts` → `findAllWithStats()` |
| **D15** | 预览接口 `POST /api/personas/preview` 不调用 personaRepo.findById，直接用传入 systemPrompt | 人格还不存在，无法通过 ID 查找 | `service/chat-svc.ts` → `preview()`；`router/persona.router.ts` |

## 二、数据模型变更

### personas 表
无新列——stats 通过 JOIN chat_records 实时聚合。

### 新建 PersonaSummary 类型
```typescript
// contracts/persona.ts
export const personaSummarySchema = personaSchema.extend({
  likeRate: z.number(), messageCount: z.number(),
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
| `personaQuerySchema` | 新增 sort?: 'popular' \| 'recent' \| 'rated' |
| `personaSummarySchema` | 新建：Persona + likeRate + messageCount |
