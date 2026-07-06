# R10 增量上下文
> 2026-07-05 | from: round-9

## 上轮教训

**R9 Tool Use / Function Calling**：工具注册表 SSOT + 工具执行器 + while loop + Persona 工具声明 + 流式工具事件。测试数 69。但**流程违规**持续。教训 L17 重申。

R10 完成"Web 客户端 + PWA"。**埋下 L21 教训** — 前端视觉零防御。

## 本轮约束

| 规则 | 要求 |
|------|------|
| AI-001 | Spec-First（advisory — **本轮违规**） |
| AI-002 | 测试先行（advisory） |
| AI-004 | 每次改动跑 trinity |
| ARCH-002 | 契约层纯净 |
| ARCH-003 | 跨层通信只经契约 |
| CODE-001 | 禁止 `any` |
| FRONTEND-001 | 前端可变配置从 API 获取（advisory — **L21 教训根因**） |
| FRONTEND-002 | 前端 API Client 与后端契约保持同步（advisory） |

> ⚠️ **本轮流程违规**：跳过 Spec-First。
> ⚠️ **L21 教训埋下**：apps/web 无测试文件、无 jsdom 环境、无 eslint-plugin-tailwindcss、check-rules 全跳过前端代码。R12 系统性修复。

## 关键决策（D20-D23）

D20 React + Vite + Tailwind 新包 apps/web · D21 路由用 HashRouter 静态 SPA 部署最简 · D22 SSE 流式用 fetch + ReadableStream · D23 PWA 用 vite-plugin-pwa (Workbox)

## 文件改动清单摘要

| 类别 | 文件数 | 关键文件 |
|------|--------|---------|
| 包配置 | 5 | apps/web/{package.json, vite.config.ts, tsconfig.json, postcss.config.js, tailwind.config.js} |
| 源码 | 8 | src/{main.tsx, App.tsx, api/client.ts, components/Layout.tsx, pages/{Home,Chat,Create,History,Profile}.tsx} |
| 样式 | 1 | src/index.css |
| 测试 | 2 | src/test/{App.test.tsx, setup.ts} |
| 根配置 | 2 | 根 package.json + pnpm-workspace.yaml |

## 风险点

| 风险 | 等级 | 缓解 |
|------|------|------|
| 跳过 Spec-First 流程违规 | **P0** | R11/R12 通过 AI-001 升级 machine-enforced 修复 |
| **L21 前端视觉零防御** | **高** | R12 通过 D40-D52 共 13 条决策系统性修复：(a) Tailwind token 封闭 (b) 双主题 + ThemeProvider (c) 8 处 UI 修复 (d) FRONTEND-001/002 升级 machine-enforced |
| 散落 hex 色未走 token | 高 | R12 D40 token 封闭修复 |
| 输入区 bg-white dark:bg-black 硬编码 | 中 | R12 D44 token 替换修复 |
| 无主题切换 + 无持久化 | 中 | R12 D41 ThemeProvider + D47 ThemeToggle 修复 |
| 无 jsdom 测试环境 | 中 | R12 引入 vitest jsdom + App.test.tsx 34 新测试 |
| 无 eslint-plugin-tailwindcss | 中 | R12 启用 + FRONTEND-002 enforcement |

## 最近提交

- 6b96f84 @ feat: AI Native 改造完成 — PersonaChat v2.0

## 快速链接

- 全量上下文: [context-snapshot.md](../context-snapshot.md)
- 上轮复盘: [round-9.md](retro/round-9.md)
- 本轮复盘: [round-10.md](retro/round-10.md)
- 流程违规复盘: [round-7-10-procedural-violation.md](retro/round-7-10-procedural-violation.md)
- 教训索引: [lessons-learned.md](retro/lessons-learned.md)
- 工作流: [spec-first-workflow.md](workflow/spec-first-workflow.md)
- AI 手册: [AGENTS.md](../../AGENTS.md)
