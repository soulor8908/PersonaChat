# R12 增量上下文
> 2026-07-06 | from: round-11

## 上轮教训

**L21 — 前端视觉零防御**：R11 在 apps/web 留下 16 个视觉/样式问题（无效 Tailwind class、硬编码颜色、padding 不一致）。根因：apps/web 无测试、无 jsdom、无 eslint-plugin-tailwindcss、check-rules 全跳过前端。

**修复三层方案**（本轮全做）：(a) 修复现有样式 (b) 添加 jsdom 冒烟测试 (c) ESLint tailwindcss + FRONTEND-001/002 强制执行。

## 本轮约束

| 范围 | 要求 |
|------|------|
| A: Tailwind token 封闭 | colors 仅 primary/surface/semantic 三组；禁用 arbitrary value |
| B: 双主题 + ThemeProvider | 暗色模式 + localStorage 持久化 + SSR 降级；CSS 变量驱动 |
| C: 8 处 UI 修复 | Skeleton shimmer / EmptyState opacity / Chat 输入区 / Create sticky / History 分组 / Profile ThemeToggle / Layout 暗色 / CardProps |
| AI-001/002/003/007 | 已升级 machine-enforced，同步改 Spec+测试+变更清单 |
| FRONTEND-001/002 | 页面改动需冒烟测试同步；Tailwind 无矛盾 class |

## 关键决策（D40-D52）

D40 token 封闭 · D41 ThemeProvider localStorage 降级 · D42 Skeleton shimmer+reduced-motion · D43 EmptyState opacity-60 · D44 Chat 输入区 token · D45 Create sticky 双栏 · D46 History 时间分组 · D47 Profile ThemeToggle · D48 Layout 暗色 · D49 CSS 变量驱动双主题 · D50 CardProps.children 可选 · D51 App.test.tsx +34 测试 · D52 FRONTEND enforcement 升级

## 文件改动清单摘要（31 文件）

| 类别 | 文件数 | 关键文件 |
|------|--------|---------|
| 配置 | 4 | tailwind.config.js / .d.ts(新) / eslint.config.js / postcss |
| 组件 | 6 | ThemeProvider(新) / Skeleton(新) / EmptyState(新) / Layout / Card / LoadingSkeleton |
| 页面 | 5 | Home / Chat / Create / History / Profile |
| 样式 | 2 | index.css / App.css |
| 测试 | 3 | App.test.tsx / setup.ts / vitest.config.ts |
| 工具/脚本 | 3 | check-rules.mjs / .trae/rules/frontend/ / .gitignore |
| 文档 | 8 | PRD/Tech-Spec/Review/Retro/Lessons/Round-delta/Snapshot/AGENTS.md |

## 风险点

| 风险 | 等级 | 缓解 |
|------|------|------|
| G0 AI-007 Spec 阶段中间态 | 低 | PRD 改动触发"必须同步改测试"。预期流程：PRD+Spec → App.test.tsx(红) → 实现 → 测试转绿 |
| Tailwind v3/v4 token 差异 | 低 | 项目锁定 v3.4.x，API 稳定 |
| CSS 变量 IE11 不支持 | 极低 | 目标 Chrome 90+ / Safari 14+ |

## 最近提交

- fc3180f @ feat: R11 小程序功能对齐 Web 端 + 全流程文档补齐

## 快速链接

- 全量上下文: [context-snapshot.md](../context-snapshot.md)
- 上轮复盘: [round-11.md](retro/round-11.md)
- 教训索引: [lessons-learned.md](retro/lessons-learned.md)
- 工作流: [spec-first-workflow.md](workflow/spec-first-workflow.md)
- AI 手册: [AGENTS.md](../../AGENTS.md)
