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

### Out of Scope

| 条目 | 原因 |
|------|------|
| 人格收藏 / 关注 | 需要用户体系，非本轮范围 |
| 人格评分评论（文本评论） | 本轮仅 like/dislike（R7 已完成） |
| 人格版本管理（多版本 systemPrompt） | 非本轮范围 |
| 人格作者主页 / 创作者激励 | 无用户体系 |
| 第三方平台分享（微信/微博分享卡片） | 非本轮范围 |
| 人格审核流程（UGC 审核） | 暂无审核后台 |
| 人格导入/导出（JSON/YAML） | 非本轮范围 |

## 四、验收标准 (AC)

### AC-F1: 人格排行

#### 正常路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F1.1 | 存在 persona（含 chat_records 关联数据） | GET /api/personas?sort=popular | 返回列表，每项含 likeRate + messageCount |
| AC-F1.2 | 存在多个 persona | GET /api/personas?sort=recent | 按创建时间倒序排列 |

#### 边界条件

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F1.3 | 不存在 persona | GET /api/personas?sort=rated | 返回空数组（不报错） |
| AC-F1.4 | persona 存在但无 chat_records | GET /api/personas?sort=popular | likeRate=0 / messageCount=0（LEFT JOIN + COALESCE 兜底） |
| AC-F1.5 | sort 参数缺失 | GET /api/personas | 使用默认排序（recent 或 popular，由实现决定） |

#### 错误路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F1.6 | sort 取非法值（如 sort=invalid） | GET /api/personas?sort=invalid | Zod schema 拒绝，返回 400 |

### AC-F2: 热门推荐

#### 正常路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F2.1 | 存在 ≥ 10 个 persona | GET /api/personas/hot | 返回 ≤ 10 条，按消息数 + 好评率加权排序 |

#### 边界条件

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F2.2 | 存在 < 10 个 persona | GET /api/personas/hot | 返回实际数量（不补全/不报错） |
| AC-F2.3 | 所有 persona 均无 chat_records | GET /api/personas/hot | 返回消息数为 0 的列表（按 stargazers 或创建时间兜底排序） |

#### 错误路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F2.4 | D1 查询异常 | GET /api/personas/hot | 由 error-handler 转为 500，不泄露 SQL 错误信息 |

### AC-F3: 人格工坊

#### 正常路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F3.1 | 有效 systemPrompt + messages | POST /api/personas/preview | 返回 200 + reply (测试 R20) |
| AC-F3.5 | 表单填写完整 + 用户点击"一键发布" | POST /api/personas | 创建人格并跳转聊天页 |

#### 边界条件

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F3.6 | systemPrompt 长度 = 8000 字符（上限） | POST /api/personas/preview | Zod schema 接受，正常返回 |
| AC-F3.7 | tools 字段为空数组 `[]` | POST /api/personas | 创建人格，无工具声明，行为与 R7 一致 |

#### 错误路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F3.2 | 空 systemPrompt | POST /api/personas/preview | 返回 400 (测试 R21) |
| AC-F3.3 | systemPrompt 超过 8000 字符 | POST /api/personas/preview | Zod schema 拒绝，返回 400 |
| AC-F3.4 | messages 数组为空 | POST /api/personas/preview | Zod schema 拒绝（min(1)），返回 400 |

## 五、测试映射

| PRD AC | 测试 ID | 测试文件 | 类型 |
|--------|---------|---------|------|
| AC-F1.1 | (sort=popular) | persona.e2e.test.ts | 正常 |
| AC-F1.2 | (sort=recent) | persona.e2e.test.ts | 正常 |
| AC-F1.3 | (sort=rated, 空列表) | persona.e2e.test.ts | 边界 |
| AC-F1.6 | (sort 非法) | persona.e2e.test.ts | 错误 |
| AC-F2.1 | (hot) | persona.e2e.test.ts | 正常 |
| AC-F3.1 | R20 | chat.e2e.test.ts（preview 用例） | 正常 |
| AC-F3.2 | R21 | chat.e2e.test.ts（preview 用例） | 错误 |
| AC-F3.3 ~ AC-F3.7 | （Zod 校验） | persona.e2e.test.ts + chat.e2e.test.ts | 边界 + 错误 |

## 六、BLOCKING Q&A

> 以下为 BA 在编写 PRD 过程中发现的歧义或缺失信息，需要相关方确认后方可推进后续轮次。

### Q1: 热门推荐的算法权重是什么？

**问题**: `GET /api/personas/hot` 返回 TOP 10，按"消息数 + 好评率加权"，但具体权重公式是什么（如 `0.5 * normalizedMessageCount + 0.5 * likeRate`）？是否需要时间衰减因子（避免历史热门永远霸榜）？是否需要考虑去重（同一作者最多展示 N 个）？

**建议确认方**: 后端开发 / 产品

### Q2: 预览接口是否需要限流？API key 由谁提供？

**问题**: `POST /api/personas/preview` 直接调用 LLM（消耗 token），未登录用户可任意调用。是否需要在 `chatRateLimiter` 中独立配置更严格的 rate limit？预览调用的 LLM API key 来自服务端配置还是用户自带？预览产生的 token 消耗是否计入 llm_call_logs？

**建议确认方**: 后端开发 / 安全负责人
