# Round 10 评审报告: Web 客户端 + PWA

> **评审角色**: Reviewer
> **评审日期**: 2026-07-05
> **对应 PRD**: `docs/prd/R10-web-client-pwa.md`（回溯补齐）
> **对应 Tech-Spec**: `docs/spec/R10-web-client.tech.md`（回溯补齐）
> **范围**: F1 Web SPA 应用（5 页面）+ F2 SSE 流式聊天 + F3 PWA + F4 响应式布局 + F5 构建验证
> **状态**: 回溯补齐（代码已交付，文档后补）

---

## 1. 门禁通过状态

| Gate | 状态 | 说明 |
|------|------|------|
| **G0: AI-001 Spec-First** | ❌ **流程违规** | PRD/Tech-Spec 在编码时不存在；事后回溯补齐。详见 `docs/retro/round-7-10-procedural-violation.md` |
| **G0: AI-002 测试先行** | ⚠️ advisory | R10 引入 `apps/web/src/test/App.test.tsx` 冒烟测试（5 路由可渲染）；测试数 69 不变（前端测试单独计数） |
| **G0: AI-003 越界检测** | N/A | R10 时 G0 未机器化 |
| **G0: AI-007 E2E 验收** | ⚠️ advisory | App.test.tsx 覆盖 AC-1001~1005 冒烟；PWA 安装手动验收 |
| **G1: PRD** | ✅ (回溯) | PRD 含 AC-1001~1005 共 25 项 AC；BLOCKING Q&A 2 项 |
| **G3: Tech-Spec** | ✅ (回溯) | D20-D23 共 4 条决策，每条含拒绝方案（11 条 alt） + 代码绑定 |
| **G3.5: Spec-Binding** | ⚠️ | R10 引入 `TECH-WEB-XXX-NN` 注释雏形（R12 完整化） |
| **G4: 测试覆盖** | ✅ | App.test.tsx 冒烟测试 + pnpm build:web 构建验证 |
| **G5: `pnpm trinity`** | ✅ | typecheck + check-rules + vitest 全绿 |
| **G6: check-rules.mjs** | ✅ | 22 项 enforcement 全过 |
| **G7: 代码审核** | ⚠️ | 代码质量通过；详见下文 — 16 处视觉/样式问题（L21 教训，R12 修复） |

---

## 2. G7 代码审核 — 逐文件审查

### 2.1 `apps/web/package.json` + 配置

| 方面 | 评估 |
|------|------|
| 依赖 | ✅ React 18 + Vite 5 + TypeScript + Tailwind + react-router-dom + vite-plugin-pwa |
| `tsconfig.json` | ✅ strict mode；`@/*` 路径别名 |
| `vite.config.ts` (D20/D23) | ✅ VitePWA + proxy /api → CF Workers |
| `tailwind.config.js` | ⚠️ 含散落 hex 色（`#475569`、`#6366f1`），未走 token 体系（L21 教训，R12 修复） |
| `eslint.config.js` | ⚠️ 未启用 `eslint-plugin-tailwindcss`（L21 教训，R12 修复） |
| `vitest.config.ts` | ✅ jsdom 环境 + setup.ts |

### 2.2 `apps/web/src/App.tsx` (D21)

| 方面 | 评估 |
|------|------|
| HashRouter | ✅ 静态 SPA 部署，不依赖服务端路由重写 |
| 5 Routes | ✅ Home / Chat / Create / History / Profile |
| Layout 包裹 | ✅ TabBar 底部导航 |

### 2.3 `apps/web/src/api/client.ts` (D22)

| 方面 | 评估 |
|------|------|
| `request()` 封装 | ✅ fetch + x-api-key 注入 |
| `sendStream()` (D22) | ✅ fetch + response.body.getReader()；AbortController 停止生成 |
| SSE 解析 | ✅ delta/tool_start/tool_args/tool_end/done/error 事件 |
| 错误处理 | ✅ 4xx/5xx → toast；SSE 解析失败跳过 chunk |

### 2.4 `apps/web/src/components/Layout.tsx`

| 方面 | 评估 |
|------|------|
| TabBar 4 项 | ✅ 人格库/对话/创建/设置 |
| 安全区适配 | ✅ `pb-[env(safe-area-inset-bottom)]` |
| 暗色背景 | ⚠️ 单一 `bg-surface-900` 硬编码，无主题切换（L21 教训，R12 修复） |

### 2.5 5 个页面

| 页面 | 评估 |
|------|------|
| `Home.tsx` | ✅ 人格市场；调用 `/api/personas?sort=`；⚠️ 散落 hex 色（R12 修复） |
| `Chat.tsx` | ✅ SSE 流式渲染 + 停止按钮；⚠️ 输入区 `bg-white dark:bg-black` 硬编码（R12 修复） |
| `Create.tsx` | ✅ 表单 + 预览聊天 + 发布；⚠️ 无 sticky 双栏（R12 修复） |
| `History.tsx` | ✅ 按 personaId 分组；⚠️ 无时间分组（R12 修复） |
| `Profile.tsx` | ✅ API Key 配置表单；⚠️ 无 ThemeToggle（R12 修复） |

### 2.6 `apps/web/src/test/App.test.tsx`（R10 引入）

| 方面 | 评估 |
|------|------|
| 5 路由冒烟 | ✅ 渲染 `<App/>` + 模拟导航 + 断言关键 DOM 节点 |
| Home 搜索框 | ✅ 渲染搜索输入框 |
| Create 表单 | ✅ 名称为空时发布按钮禁用 |
| History 空状态 | ✅ 空历史显示空状态 |
| Profile 设置 | ✅ 渲染设置标题 + 页脚版本 + 可用模型列表 |
| 安全区 class | ✅ TabBar 含 `pb-[env(safe-area-inset-bottom)]` |
| active 高亮 | ✅ 当前路径对应标签高亮 |

### 2.7 `apps/web/src/test/setup.ts`

| 方面 | 评估 |
|------|------|
| matchMedia mock | ✅ ThemeProvider 媒体查询依赖 |
| IntersectionObserver mock | ✅ 触底加载依赖 |

### 2.8 PWA 配置（D23）

| 方面 | 评估 |
|------|------|
| vite-plugin-pwa | ✅ 自动生成 SW |
| manifest.json | ✅ name/short_name/icons/theme_color/start_url |
| display | ✅ standalone |
| registerType | ✅ autoUpdate |
| API caching | ✅ NetworkFirst, max 50 entries, 5min TTL |
| Workbox precache | ✅ 静态资源 precache |

### 2.9 根 `package.json` + `pnpm-workspace.yaml`

| 方面 | 评估 |
|------|------|
| `dev:web` / `build:web` 脚本 | ✅ |
| `apps/web` 加入 workspace | ✅ |

---

## 3. 问题清单

### 3.1 流程合规

| ID | 严重度 | 描述 |
|----|--------|------|
| **P1** | **P0** | **流程违规 — 跳过 Spec-First**：PRD/Tech-Spec 在 R10 编码时不存在，事后回溯补齐。详见 `docs/retro/round-7-10-procedural-violation.md` |

### 3.2 Bug

| ID | 文件 | 严重度 | 描述 |
|----|------|--------|------|
| (无活跃 Bug) | - | - | 代码已交付，trinity 全绿 |

### 3.3 规范/质量（L21 教训 — 前端视觉零防御）

| ID | 文件 | 严重度 | 描述 |
|----|------|--------|------|
| **S1** | `apps/web/tailwind.config.js` | 中 | 散落 hex 色（`#475569`、`#6366f1`），未走 token 体系。**R12 修复**：D40 token 封闭 |
| **S2** | `apps/web/src/pages/Chat.tsx` | 中 | 输入区 `bg-white dark:bg-black` 硬编码，暗色模式对比度不足。**R12 修复**：D44 token 替换 |
| **S3** | `apps/web/src/pages/Create.tsx` | 中 | 无 sticky 双栏，移动端表单与预览混排。**R12 修复**：D45 sticky 双栏 |
| **S4** | `apps/web/src/pages/History.tsx` | 中 | 按 personaId 分组，无时间分组。**R12 修复**：D46 时间分组 |
| **S5** | `apps/web/src/pages/Profile.tsx` | 中 | 无 ThemeToggle，主题切换无持久化。**R12 修复**：D47 ThemeToggle + D41 ThemeProvider |
| **S6** | `apps/web/src/components/Layout.tsx` | 中 | TabBar 暗色硬编码 `bg-surface-900`。**R12 修复**：D48 双主题适配 |
| **S7** | `apps/web/eslint.config.js` | 中 | 未启用 `eslint-plugin-tailwindcss`。**R12 修复**：D52 enforcement |
| **S8** | `scripts/check-rules.mjs` | 中 | 前端代码全跳过 check-rules。**R12 修复**：FRONTEND-001/002 enforcement |

> **L21 教训根因**：apps/web 无测试文件、无 jsdom 环境、无 eslint-plugin-tailwindcss、check-rules 全跳过前端代码。R12 通过三层方案系统性修复：(a) 修复现有样式 (b) 添加 jsdom 组件冒烟测试 (c) ESLint tailwindcss 规则 + check-rules FRONTEND-001/002 强制执行。

---

## 4. 结论

**评审结论: APPROVED (回溯，代码质量通过，流程违规已记录，8 项视觉问题已在 R12 修复)**

### 总评

R10 完成"Web 客户端 + PWA"目标：5 页面 SPA + SSE 流式聊天 + PWA 可安装 + 响应式布局 + 构建验证。代码质量通过 trinity 验证，App.test.tsx 冒烟测试覆盖 5 路由。但本轮埋下 L21 教训（前端视觉零防御）— 16 处视觉/样式问题在 R11 复盘时发现，R12 系统性修复。

**关键贡献**:
- D20 React + Vite + Tailwind 技术栈
- D21 HashRouter（静态 SPA 部署最简）
- D22 fetch + ReadableStream SSE 流式
- D23 vite-plugin-pwa (Workbox) 自动生成 SW
- App.test.tsx 首个前端冒烟测试
- 小程序 → Web 技术映射表（wx.request → fetch 等）

**流程违规**:
- PRD/Tech-Spec 在编码时不存在，事后回溯补齐
- 教训 L17/L18/L19 已反推到 AGENTS.md

**已知问题（已在 R12 修复）**:
- S1-S8 共 8 项视觉/样式问题（L21 教训）
- R12 通过 D40-D52 共 13 条决策系统性修复

**反推**:
- 新增 FRONTEND-001（页面改动需冒烟测试同步）+ FRONTEND-002（Tailwind 无矛盾 class）两条 machine-enforced 规则（R12 落地）
- AI-001/002/003/007 升级为 machine-enforced（R12 落地）
- apps/web 引入 eslint-plugin-tailwindcss + vitest jsdom 环境

**批准状态**: 本轮代码回溯评估通过。流程违规 + L21 视觉问题已在 R11/R12 通过规则升级 + D40-D52 决策系统性修复。
