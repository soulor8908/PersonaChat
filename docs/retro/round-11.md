# Round 11 复盘 — 小程序功能对齐 Web 端

## AC 完成率: 20/20 | 测试覆盖: 手动验收 47 用例 | Blocker: 1 | 结论: CONDITIONAL → APPROVED

## 完成情况

- [x] F1 热门推荐（横滚卡片 + wx:if 守卫）
- [x] F2 排序按钮（popular/recent/rated 三态切换）
- [x] F3 卡片统计（likeRate%/messageCount/tools.length）
- [x] F4 创建入口（导航至 create 页）
- [x] F5 骨架屏 + 空状态（互斥渲染）
- [x] F6 工具状态 + 停止按钮（SSE tool_start/end）
- [x] F7 API Key 配置（password 输入 + storage 持久化）
- [x] F8 x-api-key 请求头（request + sendStream）
- [x] F9 历史分组标题降级（personaName || personaId）

## Blocker

1 个 Blocker（详见 [R11 Review](../review/R11-miniprogram-parity-review.md)）：
- **B1 (高)**：`api/client.js` 的 `sendStream()` 未注入 `x-api-key` 头 — F8 功能直接失效
- **G3.5 缺失**：F1-F9 全部新代码无 spec-binding 注释
- **2 个 Bug + 3 个规范问题**

修复后 APPROVED。

## 教训

- **L21 — 前端视觉零防御**：apps/web 有 16 个视觉/样式问题（无效 Tailwind class、硬编码颜色、padding 不一致等），全部零检测。根因：apps/web 无测试文件、无 jsdom 环境、无 eslint-plugin-tailwindcss、check-rules 全跳过前端代码。小程序同样无 lint，但 WXML/WXSS 受微信开发者工具内置校验约束。
  - 修复方案（三层）：(a) 修复现有样式问题 (b) 添加 jsdom 组件冒烟测试 (c) ESLint tailwindcss 规则 + check-rules FRONTEND-001/002 强制执行
  - **反推到 R12**：本轮（R12）需做 Tailwind token 封闭 + 双主题 + 8 处 UI 修复

## 反推

- **规则**：新增 FRONTEND-001（页面改动需冒烟测试同步）+ FRONTEND-002（Tailwind 无矛盾 class）两条 machine-enforced 规则，写入 `.trae/rules/frontend/`
- **规则**：将 AI-001/002/003/007 从 `[advisory]` 升级为 machine-enforced（L22 反推），通过 `git diff` 检测本次改动文件
- **检查器**：check-rules.mjs 增加前端 enforcement 分支（enforcement 项数 18→22）
- **工具链**：apps/web 引入 `eslint-plugin-tailwindcss` + `vitest` jsdom 环境 + `App.test.tsx` 冒烟测试模板
- **流程**：本轮首次完整走完 G1→G3→G4→G5→G7 五角色流程，验证了"先文档后代码"工作流在多角色协作下的可行性
