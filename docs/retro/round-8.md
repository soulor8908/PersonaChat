# Round 8 复盘 — 人格市场 + 工坊

## AC 完成率: 14/14 | 测试覆盖: 64→69 (新增 5) | Blocker: 0 (流程违规 1) | 结论: 代码通过 / 流程违规

## 完成情况

- [x] F1 人格排行 — `GET /api/personas?sort=popular/recent/rated` + PersonaSummary 类型
- [x] F2 热门推荐 — `GET /api/personas/hot` + 权重公式 (likeRate * 0.6 + log(messageCount) * 0.4)
- [x] F3 人格工坊 — `POST /api/personas/preview`（无副作用预览）+ create 页面表单
- [x] 小程序 + Web 同步三段式布局（热门横滚 + 排序按钮 + 列表）
- [x] 新增错误码 1004 (LLM_PREVIEW_ERROR)

## Blocker

1 个流程违规 Blocker（详见 [round-7-10-procedural-violation.md](round-7-10-procedural-violation.md)）：
- **P0 流程违规**：跳过 Spec-First，PRD/Tech-Spec 在编码时不存在，事后回溯补齐
- 代码已交付，trinity 全绿，14 项 AC E2E 用例覆盖完整

## 教训

- **L17 重申**：Plan Mode 输出的"市场方案"被等同于 PRD+Tech-Spec，实际上 PRD 需要 BA 角色（用户故事、AC 清单）、Tech-Spec 需要 Tech Lead 角色（Dx 决策、拒绝方案）。
- **质量**：D14 LEFT JOIN + COALESCE 实时聚合（无写放大，无物化视图）是优于冗余列 + 物化视图的决策；D15 预览接口不创建草稿 persona（无副作用）是优于"先建草稿再 chat"的决策。
- **遗留**：热门推荐权重公式缺时间衰减因子（历史热门可能霸榜），预览接口无独立限流 — 均为后续迭代项。

## 反推

- **规则层**：AGENTS.md Step 0 自查清单（与 R7 反推合并）
- **规则层**：AI-001/002/003/007 升级为 machine-enforced（R12 落地）
- **架构**：D14/D15 共 2 条决策反推到 R8-marketplace.tech.md（已回溯补齐）
- **后续迭代**：热门推荐权重公式应加时间衰减因子；预览接口应独立限流
