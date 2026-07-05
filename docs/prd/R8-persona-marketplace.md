# PRD: 人格市场 + 工坊 (Round 8)

> **角色**: BA | **状态**: 回溯补齐 | **对应实现**: Round 8 (已交付)

---

## 一、需求背景

PersonaChat 的人格列表只有简单的分类筛选和搜索，缺少"发现"和"创作"体验。用户没有动机去浏览其他人格，也没有便捷的工具来创建新人格。需要构建一个有人格发现和创作的双向平台。

## 二、用户故事

| ID | 故事 |
|----|------|
| US-801 | 作为用户，我希望看到热门/最新/最多互动的人格排行 |
| US-802 | 作为用户，我希望首页有热门推荐让我快速发现有趣的人格 |
| US-803 | 作为用户，我希望创建一个新人格，并在发布前能预览测试效果 |
| US-804 | 作为用户，我希望人格卡片展示好评率和对话数 |

## 三、功能需求

### F1: 人格排行 (Phase 8.1)
- `GET /api/personas` 新增 `sort` 参数: popular(好评率)/recent(最新)/rated(最多评价)
- 列表项新增 `likeRate` + `messageCount` 字段（LEFT JOIN chat_records 聚合）
- 契约层新增 `PersonaSummary` 类型

### F2: 热门推荐 (Phase 8.1)
- `GET /api/personas/hot` 返回 TOP 10（按消息数+好评率加权）
- 小程序首页三段式布局：热门横滚 + 分类筛选 + 排序列表

### F3: 人格工坊 (Phase 8.2)
- `POST /api/personas/preview` — 传入 systemPrompt + messages，返回 LLM 回复（不保存人格）
- 新建 create 页面：表单（名称/描述/systemPrompt/工具选择）+ 内嵌预览聊天 + 一键发布
- 发布后跳转到聊天页

## 四、验收标准

### AC-F1: 人格排行

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F1.1 | 存在 persona | GET /api/personas?sort=popular | 返回列表，每项含 likeRate+messageCount |
| AC-F1.2 | 存在多个 persona | GET /api/personas?sort=recent | 按创建时间倒序排列 |
| AC-F1.3 | 不存在 persona | GET /api/personas?sort=rated | 返回空数组（不报错） |

### AC-F2: 热门推荐

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F2.1 | 存在 persona | GET /api/personas/hot | 返回 ≤10 条，按权重排序 |

### AC-F3: 人格工坊

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F3.1 | 有效 systemPrompt+messages | POST /api/personas/preview | 返回 200 + reply (测试 R20) |
| AC-F3.2 | 空 systemPrompt | POST /api/personas/preview | 返回 400 (测试 R21) |

## 五、测试映射

| PRD AC | 测试 ID | 测试文件 |
|--------|---------|---------|
| AC-F1.1 | (sort=popular) | persona.e2e.test.ts |
| AC-F2.1 | (hot) | persona.e2e.test.ts |
| AC-F1.2 | (sort=recent) | persona.e2e.test.ts |
| AC-F3.1 | R20 | chat.e2e.test.ts |
| AC-F3.2 | R21 | chat.e2e.test.ts |
