# R11 增量上下文
> 2026-07-05 | from: round-10

## 上轮教训

**L21 — 前端视觉零防御**：R10 在 apps/web 留下 16 个视觉/样式问题（无效 Tailwind class、硬编码颜色、padding 不一致）。根因：apps/web 无测试、无 jsdom、无 eslint-plugin-tailwindcss、check-rules 全跳过前端。

**R7-R10 流程违规**：4 个轮次完全跳过 Spec-First 工作流。代码已交付（trinity 全绿、功能可用），但流程文档完全缺失。L17: Plan Mode ≠ Spec 文档；L18: 多轮连续交付流水线模式；L19: AGENTS.md Step 0 必须 Spec 存在性检查；L20: 流程合规无人检查需要自动化门禁。

R11 完成"小程序功能对齐 Web 端"+ 文档回溯补齐 + 流程违规修复方案。

## 本轮约束

| 规则 | 要求 |
|------|------|
| AI-001 | Spec-First（advisory — **R11 起开始严格执行**） |
| AI-002 | 测试先行（advisory） |
| AI-003 | 禁止越界发挥（advisory） |
| AI-004 | 每次改动跑 trinity |
| AI-007 | E2E 验收（advisory） |
| AI-006 | 遇到歧义必须阻断 |
| FRONTEND-001 | 前端可变配置从 API 获取（advisory） |
| FRONTEND-002 | 前端 API Client 与后端契约保持同步（advisory） |

> R11 首次完整走完 G1→G3→G4→G5→G7 五角色流程（部分合规 — 代码 + 回溯文档）。

## 关键决策（D1-D7）

D1 热门推荐使用已有 JS 方法 + WXML 渲染不创建新数据结构 · D2 热门区域使用 wx:if 守卫而非 CSS display:none · D3 停止按钮条件渲染 wx:if 切换而非始终存在 · D4 API Key 用 wx.setStorageSync 持久化而非 globalData · D5 x-api-key 每次请求时读取而非启动时缓存 · D6 历史分组标题用 personaName || key 降级策略 · D7 骨架屏优先级高于空状态

## 文件改动清单摘要

| 类别 | 文件数 | 关键文件 |
|------|--------|---------|
| 小程序首页 | 3 | pages/index/index.{js,wxml,wxss}（F1-F5） |
| 小程序聊天页 | 3 | pages/chat/chat.{js,wxml,wxss}（F6） |
| 小程序设置页 | 3 | pages/profile/profile.{js,wxml,wxss}（F7） |
| 小程序历史页 | 1 | pages/history/history.js（F9） |
| 小程序 API client | 1 | src/api/client.js（F8 x-api-key 注入） |
| 文档回溯补齐 | 14 | R7-R10 PRD × 4 + Tech-Spec × 4 + round-7-10-procedural-violation.md + AGENTS.md Step 0 + lessons-learned 更新 |

## 风险点

| 风险 | 等级 | 缓解 |
|------|------|------|
| **B1 (高) sendStream 缺少 x-api-key 头** | **高** | Review 发现，本轮修复 |
| G3.5 缺失（F1-F9 无 spec-binding 注释） | 中 | Review 发现，本轮补充 |
| 排序标签 "最多互动" 与 PRD "好评" 不一致 | 低 | Review 发现，可后续统一 |
| onStop() 无 try-catch | 中 | Review 发现，可后续修复 |
| **L21 前端视觉零防御（继承 R10）** | **高** | **反推到 R12 系统性修复**：Tailwind token 封闭 + 双主题 + 8 处 UI 修复 + FRONTEND-001/002 machine-enforced |

## 最近提交

- fc3180f @ feat: R11 小程序功能对齐 Web 端 + 全流程文档补齐

## 快速链接

- 全量上下文: [context-snapshot.md](../context-snapshot.md)
- 上轮复盘: [round-10.md](retro/round-10.md)
- 本轮复盘: [round-11.md](retro/round-11.md)
- 本轮 Review: [R11-miniprogram-parity-review.md](review/R11-miniprogram-parity-review.md)
- 流程违规复盘: [round-7-10-procedural-violation.md](retro/round-7-10-procedural-violation.md)
- 教训索引: [lessons-learned.md](retro/lessons-learned.md)
- 工作流: [spec-first-workflow.md](workflow/spec-first-workflow.md)
- AI 手册: [AGENTS.md](../../AGENTS.md)
