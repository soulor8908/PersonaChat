# PRD: 前端样式大改 + 双主题 (Round 12)

> **角色**: BA | **状态**: 新增 | **对应实现**: Round 12

---

## 一、背景与目标

### 1.1 背景

Round 11 复盘（L21 教训）发现 `apps/web` 存在 **16 个视觉/样式问题**：
- Tailwind CSS 使用散落 hex 色（`#475569`、`#6366f1`），未走 token 体系
- 输入区色调倒置（`bg-white dark:bg-black` 硬编码，与暗色主题不兼容）
- 骨架屏无 shimmer 动画，空状态 opacity 硬编码 `style={{ opacity: 0.4 }}`
- 无暗色模式支持（仅有 `bg-surface-900` 固定暗色背景）
- 无 ThemeProvider，主题切换无持久化
- Create 页无 sticky 双栏，移动端表单与预览混排
- History 页无时间分组，记录平铺
- Layout TabBar 暗色硬编码

根因：`apps/web` 无测试文件、无 jsdom 环境、无 `eslint-plugin-tailwindcss`、`check-rules.mjs` 全跳过前端代码。

### 1.2 目标

通过三层方案系统性修复前端样式问题：
- **A 层**: Tailwind token 封闭 — colors 仅 `primary` / `surface` / `semantic` 三组，禁用 arbitrary value
- **B 层**: 双主题 + ThemeProvider — 暗色模式 + localStorage 持久化 + SSR 降级 + CSS 变量驱动
- **C 层**: 8 处 UI 修复 — Skeleton shimmer / EmptyState opacity / Chat 输入区 / Create sticky / History 分组 / Profile ThemeToggle / Layout 暗色 / CardProps

### 1.3 约束

| 约束 | 说明 |
|------|------|
| AI-001 | PRD + Tech-Spec 必须在编码前存在（本文档为先行 PRD） |
| AI-002 | 改 `apps/web/src/pages/*.tsx` 必须同步改测试 |
| AI-003 | 改动源码 basename 必须在 Tech-Spec 变更清单中 |
| AI-007 | PRD 改动 → App.test.tsx 同步加测 |
| FRONTEND-001 | 页面组件必须有冒烟测试 |
| FRONTEND-002 | Tailwind CSS 无矛盾 class |
| CODE-001 | 禁止 `any` 类型 |

---

## 二、用户故事

| ID | 故事 |
|----|------|
| US-1201 | 作为用户，我希望在暗色和亮色主题间切换，且选择被记住 |
| US-1202 | 作为用户，我希望加载时有 shimmer 动画骨架屏，而非干瘪的 spinner |
| US-1203 | 作为用户，我希望空状态图标有合适的透明度，不刺眼 |
| US-1204 | 作为用户，我希望聊天输入区在暗色模式下色调正确 |
| US-1205 | 作为用户，我希望创建人格页左栏表单 sticky，右栏预览可滚动 |
| US-1206 | 作为用户，我希望对话历史按时间分组（今天/昨天/本周/更早） |
| US-1207 | 作为用户，我希望在设置页有主题切换按钮 |
| US-1208 | 作为用户，我希望底部 TabBar 在暗色模式下色调正确 |
| US-1209 | 作为开发者，我希望所有颜色走 token 体系，无散落 hex |

---

## 三、功能范围

### A: Tailwind token 封闭

**位置**: `apps/web/tailwind.config.js` + `apps/web/src/index.css`

- colors 仅保留 `primary` / `surface` / `semantic` 三组 token，含 50-900 完整阶梯
- 通过 `corePlugins: { arbitraryValues: false }` 禁用 arbitrary value
- CSS 变量驱动双主题（`:root` 亮色 / `.dark` 暗色）

### B: 双主题 + ThemeProvider

**位置**: `apps/web/src/components/ThemeProvider.tsx` + `apps/web/src/main.tsx`

- `ThemeProvider` 提供 `useTheme()` hook，含 `theme` + `setTheme()`
- localStorage 持久化（key: `theme`），SSR 安全检查 `typeof window !== 'undefined'`
- try-catch 兜底 localStorage 配额超限异常，降级到内存 state
- 初始主题读取使用 `useLayoutEffect` 避免 FOUC
- 无 localStorage 时使用 `prefers-color-scheme` 媒体查询，回退到 `light`

### C: 8 处 UI 修复

| # | 修复项 | 文件 |
|---|--------|------|
| C1 | Skeleton shimmer 动画 + reduced-motion 降级 | `components/Skeleton.tsx` (新) |
| C2 | EmptyState opacity-60 + 双主题 token | `components/EmptyState.tsx` (新) |
| C3 | Chat 输入区色调倒置修复 (token 替换硬编码) | `pages/Chat.tsx` |
| C4 | Create sticky 双栏布局 | `pages/Create.tsx` |
| C5 | History 时间分组 (今天/昨天/本周/更早) | `pages/History.tsx` |
| C6 | Profile ThemeToggle 按钮 | `pages/Profile.tsx` + `components/ThemeToggle.tsx` (新) |
| C7 | Layout TabBar 双主题适配 | `components/Layout.tsx` |
| C8 | CardProps.children 改为可选 | `components/Card.tsx` (新) |

---

## 四、验收标准 (AC)

> 标注: [正常] 正常路径 | [边界] 边界条件 | [错误] 错误路径

### A: Tailwind token 封闭

| AC ID | 类型 | Given / When / Then |
|-------|------|---------------------|
| AC-1201 | [正常] | GIVEN tailwind.config.js WHEN 检查 colors THEN 仅含 primary/surface/semantic 三组 token，每组含 50-900 完整阶梯 |
| AC-1202 | [正常] | GIVEN tailwind.config.js WHEN 检查 corePlugins THEN `arbitraryValues: false` 已禁用 |
| AC-1203 | [正常] | GIVEN index.css WHEN 检查 `:root` THEN 含 12 个语义 CSS 变量 (--color-bg, --color-fg, --color-primary 等) |
| AC-1204 | [边界] | GIVEN index.css WHEN 切换到 `.dark` THEN 所有 CSS 变量被覆盖为暗色值 |
| AC-1205 | [错误] | GIVEN 任意 .tsx 文件 WHEN 使用 arbitrary value (如 `bg-[#fff]`) THEN Tailwind 编译报错或 class 不生效 |

### B: 双主题 + ThemeProvider

| AC ID | 类型 | Given / When / Then |
|-------|------|---------------------|
| AC-1206 | [正常] | GIVEN ThemeProvider WHEN 调用 `setTheme('dark')` THEN `<html>` 添加 `class="dark"` + localStorage 写入 `theme=dark` |
| AC-1207 | [正常] | GIVEN ThemeProvider 首次加载 WHEN 无 localStorage THEN 使用 `prefers-color-scheme` 媒体查询决定主题 |
| AC-1208 | [边界] | GIVEN localStorage 已满 WHEN setTheme 触发 `setItem` 抛 QuotaExceededError THEN catch 降级到内存 state，主题仍切换成功，不抛出异常 |
| AC-1209 | [边界] | GIVEN SSR 环境 (typeof window === 'undefined') WHEN ThemeProvider 渲染 THEN 不访问 window/localStorage，返回默认主题 |
| AC-1210 | [正常] | GIVEN main.tsx WHEN 渲染 App THEN App 被 `<ThemeProvider>` 包裹 |
| AC-1211 | [错误] | GIVEN ThemeProvider WHEN localStorage.getItem 抛异常 THEN catch 后使用默认主题，不崩溃 |

### C: 8 处 UI 修复

| AC ID | 类型 | Given / When / Then |
|-------|------|---------------------|
| AC-1212 | [正常] | GIVEN Skeleton 组件 WHEN 渲染 THEN DOM 含 `animate-shimmer` class |
| AC-1213 | [边界] | GIVEN 用户开启 `prefers-reduced-motion` WHEN 渲染 Skeleton THEN shimmer 动画被禁用 (`animation: none`) |
| AC-1214 | [正常] | GIVEN EmptyState 组件 WHEN 渲染 THEN DOM 含 `opacity-60` class (非硬编码 style) |
| AC-1215 | [正常] | GIVEN Chat 页 WHEN 渲染输入区 THEN class 含 `bg-surface-50 dark:bg-surface-900` 而非 `bg-white dark:bg-black` |
| AC-1216 | [正常] | GIVEN Chat 页 WHEN 渲染消息气泡 THEN assistant 用 `bg-surface-100 dark:bg-surface-800`，user 用 `bg-primary-500 text-white` |
| AC-1217 | [正常] | GIVEN Create 页 WHEN 在桌面端 (lg) 渲染 THEN 左栏含 `lg:sticky` class |
| AC-1218 | [边界] | GIVEN Create 页 WHEN 在移动端渲染 THEN 单列堆叠，无 sticky |
| AC-1219 | [正常] | GIVEN History 页 WHEN 有不同时间记录 THEN 渲染含"今天"/"昨天"/"本周"/"更早"分组标题 |
| AC-1220 | [边界] | GIVEN History 页 WHEN 无记录 THEN 复用 `<EmptyState>` 组件，含 `opacity-60` |
| AC-1221 | [正常] | GIVEN Profile 页 WHEN 渲染 THEN 含 ThemeToggle 按钮，有 `aria-pressed` 属性 |
| AC-1222 | [正常] | GIVEN Profile 页 WHEN 点击 ThemeToggle THEN 调用 `useTheme().setTheme()` 切换主题 |
| AC-1223 | [正常] | GIVEN Layout TabBar WHEN 渲染 THEN 底栏 class 含 `bg-surface-800 dark:bg-surface-900` 双主题适配 |
| AC-1224 | [正常] | GIVEN Layout TabBar WHEN active 状态 THEN 使用 `text-primary-500` token 引用 |
| AC-1225 | [正常] | GIVEN Card 组件 WHEN 不传 children THEN 正常渲染不报错 (children 可选) |
| AC-1226 | [边界] | GIVEN Card 组件 WHEN 传 children THEN children 渲染在内容区 |

### 测试覆盖

| AC ID | 类型 | Given / When / Then |
|-------|------|---------------------|
| AC-1227 | [正常] | GIVEN App.test.tsx WHEN 运行 THEN token 封闭测试验证 colors 仅三组 |
| AC-1228 | [正常] | GIVEN App.test.tsx WHEN 运行 THEN 主题切换测试验证 `<html class="dark">` 生效 |
| AC-1229 | [错误] | GIVEN App.test.tsx WHEN mock localStorage.setItem 抛异常 THEN 主题仍切换成功 |
| AC-1230 | [正常] | GIVEN App.test.tsx WHEN 运行 THEN 8 处 UI 修复均有对应断言 (shimmer / opacity-60 / bg-surface-50 / lg:sticky / 分组标题 / aria-pressed) |

---

## 五、Out of Scope

| 项 | 说明 |
|----|------|
| 后端 API 变更 | 本轮纯前端，不涉及 `apps/api` |
| 小程序样式 | 本轮仅 `apps/web`，小程序样式在 R11 已对齐 |
| 新增页面 | 不新增页面，仅改造现有 5 页 + Layout |
| 国际化 (i18n) | 不引入 i18n，文案沿用中文 |
| 动画库引入 | 不引入 framer-motion 等，仅用 CSS keyframes |
| PWA 配置变更 | 不改动 vite-plugin-pwa 配置 |

---

## 六、BLOCKING Q&A

> **审计重写 (2026-07-06)**：原 BLOCKING Q&A 段落 4 个问题全部标注"已决定"，且 Q3/Q4 引用 review Dx 编号但未提供文件路径，语义错位（BLOCKING 应为 BA 阶段未决歧义点，非 review 后回填记录）。重写如下：BA 阶段真正的 BLOCKING 问题在 Tech-Spec 撰写时已通过 Dx 决策解决；review 阶段发现的 2 项 Spec 偏离（D-1/D-3）已通过 `docs/spec/backrefactor-r12-impl-deviations.md` 回溯记录。

### BA 阶段 BLOCKING 问题（已在 Tech-Spec 阶段解决）

| Q | A | 解决方式 | 解决位置 |
|---|---|---------|---------|
| Tailwind v3 还是 v4? | 项目锁定 v3.4.x (`package.json` 已声明)，API 稳定。v4 有 breaking change（`dark:` 默认 media、`@theme` 指令语法变更），不在本轮升级 | Tech-Spec D40 拒绝方案"D40 alt2" | [R12 Tech-Spec 一、D40](../spec/R12-frontend-style-overhaul.tech.md) |
| 主题切换用 `class` 还是 `media`? | 用 `dark: 'class'` 模式，允许用户手动覆盖。`media` 模式无法让用户手动切换，违反"用户可控"预期 | Tech-Spec D40 决策 `darkMode: 'class'` | [R12 Tech-Spec 一、D40](../spec/R12-frontend-style-overhaul.tech.md) |
| 双主题用 CSS 变量还是 `dark:` 前缀? | CSS 变量方案。每个组件写 `dark:` 变体维护成本高；CSS 变量只需改 `<html class>`，所有引用变量的组件自动级联 | Tech-Spec D49 决策 + 拒绝方案"D49 alt" | [R12 Tech-Spec 一、D49](../spec/R12-frontend-style-overhaul.tech.md) |
| Skeleton 用 spinner 还是 shimmer? | shimmer 动画。shimmer 比 spinner 更生动，传达"内容加载中"而非"系统转圈"。PRD AC-1212 明确要求 shimmer | Tech-Spec D42 决策 + 拒绝方案"D42 alt" | [R12 Tech-Spec 一、D42](../spec/R12-frontend-style-overhaul.tech.md) |
| History 按时间还是按 persona 分组? | 按时间分组（今天/昨天/本周/更早）。用户心智模型是按时间找对话，不是按 persona | Tech-Spec D46 决策 + 拒绝方案"D46 alt" | [R12 Tech-Spec 一、D46](../spec/R12-frontend-style-overhaul.tech.md) |

### Review 阶段发现的 Spec 偏离（已回溯记录）

| 偏离编号 | 描述 | 回溯记录位置 |
|---------|------|-------------|
| D-1 | 新增 `tailwind.config.d.ts` 为 `import tailwindConfig` 提供类型支持（Spec 未声明） | [backrefactor-r12-impl-deviations.md D-1](../spec/backrefactor-r12-impl-deviations.md) |
| D-2 | `test/setup.ts` 新增 `scrollTo` mock（Spec 未声明，jsdom 无原生 scrollTo） | [backrefactor-r12-impl-deviations.md D-2](../spec/backrefactor-r12-impl-deviations.md) |
| D-3 | `CardProps.children` 改为可选（Spec 原描述必填） | [backrefactor-r12-impl-deviations.md D-3](../spec/backrefactor-r12-impl-deviations.md) |

---

## 七、测试映射

| AC 范围 | 测试文件 | 用例数 |
|---------|---------|--------|
| A: token 封闭 (AC-1201~1205) | `apps/web/src/test/App.test.tsx` | 5 |
| B: 双主题 (AC-1206~1211) | `apps/web/src/test/App.test.tsx` | 6 |
| C: 8 处 UI 修复 (AC-1212~1226) | `apps/web/src/test/App.test.tsx` | 15 |
| 测试覆盖 (AC-1227~1230) | `apps/web/src/test/App.test.tsx` | 4 |
| Layout 基础冒烟 (保留) | `apps/web/src/test/App.test.tsx` | 原有用例保留 |
| **合计** | | **30 新增 + 原有保留** |
