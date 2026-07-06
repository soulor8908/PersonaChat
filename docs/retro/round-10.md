# Round 10 复盘 — Web 客户端 + PWA

## AC 完成率: 25/25 | 测试覆盖: App.test.tsx 冒烟 + 69 后端 | Blocker: 0 (流程违规 1 + 8 项视觉问题) | 结论: 代码通过 / 流程违规 + L21 视觉零防御

## 完成情况

- [x] F1 Web SPA 应用 — React 18 + Vite 5 + TypeScript + Tailwind + 5 页面
- [x] F2 SSE 流式聊天 — fetch + ReadableStream + AbortController
- [x] F3 PWA — vite-plugin-pwa (Workbox) + manifest.json + service worker
- [x] F4 响应式布局 — 移动端优先 + max-w-lg 居中 + 底部 TabBar
- [x] F5 构建验证 — `pnpm build:web` + TypeScript strict
- [x] App.test.tsx 首个前端冒烟测试（5 路由可渲染）
- [x] 小程序 → Web 技术映射表（wx.request → fetch 等）

## Blocker

1 个流程违规 Blocker + 8 项视觉问题（详见 [round-7-10-procedural-violation.md](round-7-10-procedural-violation.md) + [R10 Review](../review/R10-web-client-review.md)）：
- **P0 流程违规**：跳过 Spec-First，PRD/Tech-Spec 在编码时不存在，事后回溯补齐
- **L21 前端视觉零防御**：apps/web 有 16 处视觉/样式问题（散落 hex 色、硬编码颜色、padding 不一致、无主题切换等），全部零检测。根因：apps/web 无测试文件、无 jsdom 环境、无 eslint-plugin-tailwindcss、check-rules 全跳过前端代码。

## 教训

- **L17 重申**：Plan Mode 输出的"Web 客户端方案"被等同于 PRD+Tech-Spec。
- **L21 — 前端视觉零防御**：apps/web 有 16 个视觉/样式问题（无效 Tailwind class、硬编码颜色、padding 不一致等），全部零检测。根因：apps/web 无测试文件、无 jsdom 环境、无 eslint-plugin-tailwindcss、check-rules 全跳过前端代码。小程序同样无 lint，但 WXML/WXSS 受微信开发者工具内置校验约束。
  - 修复方案（三层）：(a) 修复现有样式问题 (b) 添加 jsdom 组件冒烟测试 (c) ESLint tailwindcss 规则 + check-rules FRONTEND-001/002 强制执行
  - **反推到 R12**：本轮（R12）需做 Tailwind token 封闭 + 双主题 + 8 处 UI 修复
- **质量**：D21 HashRouter 是静态 SPA 部署最简方案；D22 fetch + ReadableStream 是 SSE POST 的标准方案；D23 vite-plugin-pwa 自动生成 SW 是工业级方案。

## 反推

- **规则层**：新增 FRONTEND-001（页面改动需冒烟测试同步）+ FRONTEND-002（Tailwind 无矛盾 class）两条 machine-enforced 规则（R12 落地）
- **规则层**：AI-001/002/003/007 升级为 machine-enforced（R12 落地）
- **工具链**：apps/web 引入 eslint-plugin-tailwindcss + vitest jsdom 环境 + App.test.tsx 冒烟测试模板
- **架构**：D20-D23 共 4 条决策反推到 R10-web-client.tech.md（已回溯补齐）
- **R12 行动**：D40-D52 共 13 条决策系统性修复 L21 视觉零防御问题
