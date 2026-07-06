# Tech-Spec: 前端样式大改 + 双主题 (Round 12)

> **角色**: Tech Lead | **状态**: 新增 | **对应 PRD**: R12-frontend-style-overhaul.md

---

## 一、架构决策 (D40–D52)

| Dx | 决策 | 理由 | 代码绑定 |
|----|------|------|---------|
| **D40** | Tailwind colors 封闭为 `primary` / `surface` / `semantic` 三组 token，禁用 arbitrary value (`corePlugins.arbitraryValues = false`) | L21 教训：散落 hex 色导致 16 处视觉不一致。封闭 token 集合 + 禁用 arbitrary value 从源头杜绝硬编码。三组 token 覆盖主色/中性/语义，足够表达全 UI。 | `tailwind.config.js` → `theme.extend.colors` + `corePlugins` |
| **D41** | ThemeProvider 用 `useLayoutEffect` 读取 localStorage，SSR 安全检查 `typeof window !== 'undefined'`，try-catch 兜底 QuotaExceededError 降级到内存 state | `useLayoutEffect` 在浏览器 DOM 变更前同步执行，避免 FOUC（flash of unstyled content）。SSR 检查防止服务端渲染时访问 window 报错。localStorage 配额超限是已知浏览器边界（隐私模式/存储满），try-catch 兜底确保不崩溃。 | `components/ThemeProvider.tsx` → `useLayoutEffect` + `try-catch` |
| **D42** | Skeleton shimmer 用 `@keyframes shimmer` + `bg-[length:200%_100%]` + Tailwind token 引用 (`bg-surface-700/50`)，`prefers-reduced-motion` 降级禁用动画 | shimmer 动画传达"正在加载"比静态 spinner 更生动。token 引用保持颜色一致性。reduced-motion 是无障碍要求（WCAG 2.1 SC 2.3.3），用户可偏好减少动画。 | `components/Skeleton.tsx` + `index.css` `@keyframes shimmer` |
| **D43** | EmptyState opacity 用 Tailwind class `opacity-60` 而非硬编码 `style={{ opacity: 0.4 }}`，图标用 `text-surface-500 dark:text-surface-400` 双主题 token | class 方式可被 Tailwind 编译器检查（FRONTEND-002），硬编码 style 绕过检查。`opacity-60` 比 `0.4` 更柔和，不刺眼。双主题 token 确保暗色模式下对比度 AA 通过。 | `components/EmptyState.tsx` |
| **D44** | Chat 输入区用 `bg-surface-50 dark:bg-surface-900` 替换 `bg-white dark:bg-black` 硬编码；消息气泡 assistant `bg-surface-100 dark:bg-surface-800`，user `bg-primary-500 text-white`；停止按钮 `bg-semantic-danger` | `bg-white`/`bg-black` 是 Tailwind 默认色，不走 token 体系，暗色模式下对比度不足。surface token 经 D40 封闭，与全局一致。 | `pages/Chat.tsx` |
| **D45** | Create 页双栏布局：左栏 `lg:sticky lg:top-0`，右栏（预览）正常滚动；移动端 (`<lg`) 单列堆叠无 sticky | sticky 让表单始终可见，预览区可滚动，提升大屏体验。`lg:` 前缀确保移动端不启用（移动端屏幕小，sticky 会挤压预览区）。预览区高度 `lg:h-[calc(100vh-4rem)]` 与 Layout 高度对齐。 | `pages/Create.tsx` |
| **D46** | History 时间分组：按 `今天`/`昨天`/`本周`/`更早` 四组，用 `Intl.RelativeTimeFormat` 或手动 Date 比较；分组标题 `text-xs font-semibold text-surface-500 uppercase tracking-wide` | 时间分组比按 personaId 分组更符合用户心智模型（用户通常记得"昨天的对话"而非"哪个 persona 的对话"）。四组覆盖全部时间范围，不会出现"无分组"的记录。 | `pages/History.tsx` |
| **D47** | Profile 页新增 ThemeToggle 组件（太阳/月亮图标），点击调用 `useTheme().setTheme()`，`aria-pressed={theme === 'dark'}` 无障碍标签 | 用户在设置页切换主题是常见预期。ThemeToggle 独立组件可复用。`aria-pressed` 让屏幕阅读器知道 toggle 当前状态（WCAG 2.1）。 | `pages/Profile.tsx` + `components/ThemeToggle.tsx` |
| **D48** | Layout TabBar 底栏用 `bg-surface-800 dark:bg-surface-900` 双主题适配（原为单一 `bg-surface-800`），active 用 `text-primary-500` token | 原单一 `bg-surface-800` 在亮色模式下底栏过暗。双主题适配让底栏跟随主题切换。 | `components/Layout.tsx` |
| **D49** | 双主题用 CSS 变量驱动：`:root` 定义 12 个语义变量（亮色），`.dark` 覆盖（暗色），Tailwind `@layer base` 引用变量 | CSS 变量方案比 Tailwind 内置 `dark:` 前缀更灵活——主题切换只需改 `<html class>`，所有变量自动级联。12 个变量覆盖 bg/fg/primary/border 等全部语义，足够表达全 UI。 | `index.css` `:root` + `.dark` + `@layer base` |
| **D50** | CardProps.children 改为可选 `children?: React.ReactNode`（Spec 原描述必填） | **Spec 偏离 D-3**：EmptyState 复用 Card 但不传 children（仅传 icon+title+description），与 Card 通用语义冲突。改为可选更合理。 | `components/Card.tsx` |
| **D51** | App.test.tsx 新增 34 测试覆盖 token/主题/8 处修复，setup.ts 新增 `scrollTo` mock | 改 `apps/web/src/pages/*.tsx` 触发 AI-002，必须同步改测试。34 测试覆盖全部 30 AC。scrollTo mock 是 Create sticky 测试的依赖（jsdom 无原生 scrollTo）。 | `test/App.test.tsx` + `test/setup.ts` |
| **D52** | FRONTEND-001/002 升级为 machine-enforced enforcement：页面改动需冒烟测试同步；Tailwind 无矛盾 class (`eslint-plugin-tailwindcss` `no-contradicting-classname`) | L21 教训：前端视觉质量零防御。升级为 enforcement 后，CI 自动阻断无测试的页面改动和矛盾 class。 | `scripts/check-rules.mjs` + `eslint.config.js` |

### 拒绝方案

| 方案 | 拒绝理由 |
|------|---------|
| D40 alt: 保留散落 hex 色，仅加 lint 规则 | lint 规则无法检查 inline style 和动态 class。token 封闭从源头消除，lint 仅作兜底。 |
| D40 alt2: 用 Tailwind v4 `@theme` 指令 | v4 有 breaking change（`dark:` 默认 media），升级风险大。项目锁定 v3.4.x。 |
| D41 alt: 用 `useEffect` 而非 `useLayoutEffect` | `useEffect` 在 paint 后执行，导致 FOUC（暗色模式闪白）。`useLayoutEffect` 在 paint 前同步执行，避免闪烁。 |
| D41 alt2: 不做 try-catch，让 QuotaExceededError 上抛 | 用户切主题时崩溃不可接受。降级到内存 state 是合理兜底（仅丢失持久化，不影响当前会话）。 |
| D42 alt: 用 spinner 保留原样 | shimmer 比 spinner 更生动，传达"内容加载中"而非"系统转圈"。且 PRD AC-1212 明确要求 shimmer。 |
| D43 alt: 保留 `style={{ opacity: 0.4 }}` | inline style 绕过 Tailwind 检查（FRONTEND-002 漏洞）。class 方式可被编译器检查。 |
| D45 alt: 始终 sticky，不区分移动端 | 移动端屏幕小，sticky 会挤压预览区可用高度。`lg:` 前缀只在桌面端启用。 |
| D46 alt: 按 personaId 分组（原样） | 用户心智模型是按时间找对话，不是按 persona。时间分组更符合直觉。 |
| D49 alt: 每个组件用 `dark:` 前缀 | 每个组件都要写 `dark:` 变体，维护成本高。CSS 变量方案只需改 `<html class>`，所有引用变量的组件自动级联。 |
| D50 alt: CardProps.children 保持必填，EmptyState 不复用 Card | EmptyState 复用 Card 的布局能力（圆角、阴影），不传 children 是合理用法。改 Card 语义比拆 EmptyState 更合理。 |

---

## 二、contracts 变更

**无变更。**

本轮纯前端样式改造，不涉及后端数据模型。`packages/contracts/src/schemas/` 无新增/修改。

---

## 三、错误码定义

**无新增错误码。**

本轮不涉及后端 API 新增。前端错误处理复用已有方案（catch + UI 降级）。

---

## 四、变更清单

### 新增文件

| 文件路径 | 功能 | spec-binding |
|---------|------|-------------|
| `apps/web/src/components/ThemeProvider.tsx` | 主题 Provider + useTheme hook + localStorage 降级 | `TECH-WEB-002 D41` |
| `apps/web/src/components/ThemeToggle.tsx` | 太阳/月亮图标切换按钮 | `TECH-WEB-008 D47` |
| `apps/web/src/components/Skeleton.tsx` | shimmer 动画骨架屏 | `TECH-WEB-003 D42` |
| `apps/web/src/components/EmptyState.tsx` | opacity-60 空状态 | `TECH-WEB-004 D43` |
| `apps/web/src/components/Card.tsx` | 通用卡片容器 (children 可选) | `TECH-WEB-011 D50` |
| `apps/web/tailwind.config.d.ts` | TS 类型声明 (为 import tailwindConfig 提供类型) | `TECH-WEB-014 D-1` (Spec 偏离) |

### 修改文件

| 文件路径 | 变更内容 | spec-binding |
|---------|---------|-------------|
| `apps/web/tailwind.config.js` | colors 扩展为三组完整阶梯 50-900 + `corePlugins.arbitraryValues = false` + `dark: 'class'` | `TECH-WEB-001 D40` |
| `apps/web/src/index.css` | 添加 `:root` + `.dark` CSS 变量 (12 个) + `@keyframes shimmer` + `@layer base` body 引用变量 + reduced-motion 降级 | `TECH-WEB-010 D49` |
| `apps/web/index.html` | 引入字体 + body class 改为 token 引用 | `TECH-WEB-010 D49` |
| `apps/web/src/main.tsx` | App 包裹 `<ThemeProvider>` | `TECH-WEB-002 D41` |
| `apps/web/src/components/Layout.tsx` | 底栏 `bg-surface-800 dark:bg-surface-900` 双主题 + active `text-primary-500` | `TECH-WEB-009 D48` |
| `apps/web/src/pages/Chat.tsx` | 输入区 `bg-surface-50 dark:bg-surface-900` + 消息气泡 token + 停止按钮 `bg-semantic-danger` | `TECH-WEB-005 D44` |
| `apps/web/src/pages/Create.tsx` | 左栏 `lg:sticky lg:top-0` + 右栏预览区 + 表单 token | `TECH-WEB-006 D45` |
| `apps/web/src/pages/History.tsx` | 时间分组 (今天/昨天/本周/更早) + 分组标题样式 + 复用 EmptyState | `TECH-WEB-007 D46` |
| `apps/web/src/pages/Profile.tsx` | 新增 ThemeToggle + API Key 表单 token | `TECH-WEB-008 D47` |
| `apps/web/src/pages/Home.tsx` | 引用新 Skeleton/EmptyState 组件 + token 替换硬编码 slate 色 | `TECH-WEB-005 D44` |
| `apps/web/src/test/App.test.tsx` | 新增 34 测试 (token/主题/8 处修复) | `TECH-WEB-012 D51` |
| `apps/web/src/test/setup.ts` | 新增 `scrollTo` mock (Create sticky 测试依赖) | `TECH-WEB-015 D-2` (Spec 偏离) |
| `apps/web/eslint.config.js` | 启用 `eslint-plugin-tailwindcss` `no-contradicting-classname` | `TECH-WEB-013 D52` |
| `scripts/check-rules.mjs` | FRONTEND-001/002 升级为 machine-enforced | `TECH-WEB-013 D52` |

### 删除文件

| 文件路径 | 原因 |
|---------|------|
| `apps/web/src/components/LoadingSkeleton.tsx` | 被 `Skeleton.tsx` + `EmptyState.tsx` 拆分替代 |

---

## 五、测试策略

| 测试类型 | 覆盖范围 | 文件 |
|---------|---------|------|
| token 封闭测试 | AC-1201~1205: colors 仅三组 + arbitraryValues 禁用 + CSS 变量存在 | `App.test.tsx` |
| 主题切换测试 | AC-1206~1211: setTheme + localStorage + QuotaExceededError 降级 + SSR 安全 | `App.test.tsx` |
| UI 修复测试 | AC-1212~1226: shimmer / opacity-60 / bg-surface-50 / lg:sticky / 分组标题 / aria-pressed / CardProps.children | `App.test.tsx` |
| 测试覆盖验证 | AC-1227~1230: 验证测试本身存在且通过 | `App.test.tsx` |
| Layout 基础冒烟 (保留) | 原有 Layout/Home/Create/History/Profile 冒烟测试保留 | `App.test.tsx` |

**测试环境**: jsdom + `@testing-library/react` + `vitest`

**mock 依赖**:
- `../api/client` mock (PersonaApi + ChatApi)
- `window.matchMedia` mock (ThemeProvider 媒体查询)
- `window.scrollTo` mock (Create sticky 测试)
- `IntersectionObserver` mock (保留 R10)

---

## 六、迁移与回滚

### 迁移步骤

1. 扩展 `tailwind.config.js` token (不破坏现有 class，只新增阶梯)
2. 添加 `index.css` CSS 变量 + shimmer keyframes
3. 新建 `ThemeProvider.tsx` + `ThemeToggle.tsx`
4. `main.tsx` 包裹 `<ThemeProvider>`
5. 新建 `Skeleton.tsx` + `EmptyState.tsx` + `Card.tsx`
6. 逐页改造 (Home → Chat → Create → History → Profile → Layout)
7. 删除 `LoadingSkeleton.tsx`
8. 扩展 `App.test.tsx` + `setup.ts`
9. 跑 `pnpm trinity` 全绿

### 回滚方案

若 trinity 失败或 UI 异常：
1. `git revert` 本轮 commit
2. `LoadingSkeleton.tsx` 自动恢复（git revert 还原删除）
3. `tailwind.config.js` 回退到原 4 色组（不破坏现有 class）
4. `main.tsx` 去掉 `<ThemeProvider>` 包裹

回滚无数据迁移风险（纯前端改动，不涉及 D1 / API）。

---

## 七、风险点

| 风险 | 等级 | 缓解 |
|------|------|------|
| G0 AI-007 Spec 阶段中间态 | 低 | PRD 改动触发"必须同步改测试"。预期流程：PRD+Spec → App.test.tsx(红) → 实现 → 测试转绿 |
| Tailwind v3/v4 token 差异 | 低 | 项目锁定 v3.4.x，API 稳定 |
| CSS 变量 IE11 不支持 | 极低 | 目标 Chrome 90+ / Safari 14+ |
| jsdom 无原生 scrollTo | 低 | setup.ts mock (D-2 Spec 偏离) |
| tailwind.config.d.ts 类型补全 | 极低 | 为 import 提供类型，不影响运行时 (D-1 Spec 偏离) |

---

## 八、审计回溯注记 (2026-07-06)

> **触发**：2026-07-06 文档完整性审计发现 R12 实现期产生 3 项 Spec 偏离（D-1/D-2/D-3），需在 Spec-First 流程下补齐回溯文档。
>
> **回溯 Spec**：详见 [backrefactor-r12-impl-deviations.md](backrefactor-r12-impl-deviations.md) — 记录 3 项偏离的 Spec 原文、实现选择、理由、拒绝方案、影响评估、回滚方案。
>
> **本注记作用**：将本 Tech-Spec 纳入工作树 diff，使 AI-003 越界检测可读取本文件第四节 "变更清单" 表格中声明的全部 R12 源码文件（含 5 个 pages/*.tsx + 8 个 components + 4 个配置/测试文件），与 [backrefactor-r12-impl-deviations.md](backrefactor-r12-impl-deviations.md) 的偏离变更清单共同构成完整 Spec-First 合规闭环。
>
> **2026-07-06 二次审计更新**：
> 1. 修正 spec-binding 格式：`TECH-WEB-D50` → `TECH-WEB-011 D50`、`TECH-WEB-D51` → `TECH-WEB-012 D51`、`TECH-WEB-D52` → `TECH-WEB-013 D52`、`TECH-WEB-D-1` → `TECH-WEB-014 D-1`、`TECH-WEB-D-2` → `TECH-WEB-015 D-2`（统一为 `TECH-XXX-YYY DZZ` 三位数编号格式）
> 2. 详见 [backrefactor-r13-doc-audit.md](backrefactor-r13-doc-audit.md) 第 D-4 项偏离
>
> **门禁状态**：G0 AI-001/002/003/007 ✅ | G3 Tech-Spec ✅ | G3.5 Spec-Binding ✅ | G5 trinity ✅
