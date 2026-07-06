# 回溯 Spec: R12 前端样式大改 — 实现偏离记录

> **角色**: Tech Lead (回溯) | **状态**: 实现期偏离记录 | **对应 Tech-Spec**: [R12-frontend-style-overhaul.tech.md](R12-frontend-style-overhaul.tech.md)
> **触发**: R12 实现期间因具体技术约束，对原 Tech-Spec 的 3 项设计做出偏离调整。本文件记录每项偏离的 Spec 原文、实现选择、理由与影响评估，作为 Spec-First 流程的合规闭环。

---

## 一、偏离总览

| 偏离编号 | 偏离点 | Spec 原描述 | 实现选择 | 严重度 | 风险 |
|---------|--------|------------|---------|--------|------|
| **D-1** | 新增 `apps/web/tailwind.config.d.ts` | Tech-Spec 变更清单未列出此文件 | 实现期为 `import tailwindConfig from './tailwind.config.js'` 提供类型支持，新增 d.ts | 低 | 仅类型层，不影响运行时 |
| **D-2** | `apps/web/src/test/setup.ts` 新增 `scrollTo` mock | Tech-Spec 未列出 setup.ts 的 scrollTo mock | jsdom 无原生 `HTMLElement.prototype.scrollTo`，Create sticky 测试需要 mock | 低 | 仅测试工具层 |
| **D-3** | `CardProps.children` 改为可选 | Tech-Spec D50 原描述 CardProps.children 必填 | EmptyState 复用 Card 但仅传 icon+title+description（不传 children） | 低 | EmptyState 用法合理 |

---

## 二、偏离详情

### D-1: tailwind.config.d.ts 新增

**Spec 原文**（[R12-frontend-style-overhaul.tech.md](R12-frontend-style-overhaul.tech.md) 第四节 "新增文件" 表格）：
- Tech-Spec 列出的新增文件中未包含 `apps/web/tailwind.config.d.ts`

**实现选择**：
- 新增 `apps/web/tailwind.config.d.ts`，导出 `SimpleTailwindConfig` 接口与默认 config 对象
- 测试代码 `import tailwindConfig from '../../tailwind.config.js'` 需要 TS 类型支持，否则 typecheck 报错 "File is not a module"

**理由**：
- Tailwind config 使用 ESM `export default`，但 `.js` 文件无 `.d.ts` 时 TypeScript `moduleResolution: bundler` 无法推断类型
- 简化 `SimpleTailwindConfig` 接口（仅暴露 colors/corePlugins/darkMode）便于测试访问，避免引入 `tailwindcss` 包的 `Config` 类型带来的运行时依赖

**拒绝方案**：
| 方案 | 拒绝理由 |
|------|---------|
| 在测试中用 `as any` 绕过类型 | 违反 CODE-001 禁止 any |
| 用 `// @ts-expect-error` 抑制错误 | 牺牲类型安全，且 TS 严格模式下 expect-error 反而报"未使用" |
| 直接 import `Config` from 'tailwindcss' | 引入 tailwindcss 运行时依赖到测试环境，与 D-1 简化接口的初衷冲突 |

**影响评估**：极低 — 仅类型声明文件，不影响运行时；测试代码 `tailwindConfig.theme.extend.colors` 等访问得到类型推断。

**代码绑定**：
- 新增文件：`apps/web/tailwind.config.d.ts`
- 引用处：`apps/web/src/test/App.test.tsx` (AC-1201~1205 token 封闭测试)

---

### D-2: setup.ts scrollTo mock 新增

**Spec 原文**（[R12-frontend-style-overhaul.tech.md](R12-frontend-style-overhaul.tech.md) 第四节 "修改文件" 表格）：
- `apps/web/src/test/setup.ts` 仅描述 "新增 matchMedia mock + IntersectionObserver mock"

**实现选择**：
- 在 setup.ts 新增 `HTMLElement.prototype.scrollTo = vi.fn() as unknown as typeof HTMLElement.prototype.scrollTo`
- Create 页 sticky 测试（AC-1220）触发 `scrollTo` 调用，jsdom 无原生实现

**理由**：
- jsdom v29 不实现 `HTMLElement.prototype.scrollTo`（参考 jsdom issue #1422）
- `as unknown as typeof ...` 双重断言绕过 Mock 类型与重载签名不匹配
- 第一次尝试 `as typeof HTMLElement.prototype.scrollTo` 仍报错（Mock<[x,y], void> 与 ScrollToOptions 重载不兼容）

**拒绝方案**：
| 方案 | 拒绝理由 |
|------|---------|
| 在测试中用 `window.scrollTo = vi.fn()` 替代 | 仅覆盖 window，不覆盖 HTMLElement 实例方法 |
| 跳过 sticky 测试 | 违反 AC-1220 验收标准 |
| 升级 jsdom 到支持 scrollTo 的版本 | jsdom 至今未实现，无可用版本 |

**影响评估**：低 — 仅测试工具层 mock，不影响生产代码；vitest 运行时正确响应 mock。

**代码绑定**：
- 修改文件：`apps/web/src/test/setup.ts`
- 引用处：`apps/web/src/test/App.test.tsx` AC-1220 Create sticky 测试

---

### D-3: CardProps.children 改为可选

**Spec 原文**（[R12-frontend-style-overhaul.tech.md](R12-frontend-style-overhaul.tech.md) 第二节 D50）：
> CardProps.children 改为可选 `children?: React.ReactNode`（Spec 原描述必填）... EmptyState 复用 Card 但不传 children

**实现选择**：
- `Card.tsx` 中 `interface CardProps { children?: React.ReactNode; ... }`（children 加 `?`）
- EmptyState 组件 `<Card><Icon/><Title/><Description/></Card>` 但 Icon/Title/Description 通过 props 而非 children 传入

**理由**：
- EmptyState 复用 Card 的视觉容器（圆角、阴影、padding），但内容通过 props 而非 children 组合
- 强制 children 必填会让 EmptyState 不得不传 `<Card>{null}</Card>` 或重复实现 Card 容器
- React 语义中 `children?` 可选是常见模式（如 `<Card title="..." />` 仅展示标题）

**拒绝方案**：
| 方案 | 拒绝理由 |
|------|---------|
| EmptyState 不复用 Card，独立实现容器样式 | 重复样式代码，违反 DRY；与 D44 "Card 通用化" 决策冲突 |
| EmptyState 传 `<Card>{null}</Card>` | 显式传 null 是反模式，TypeScript 严格模式下需额外处理 |
| 拆分 Card 为 CardContainer + CardWithChildren | 过度抽象，8 个组件中仅 EmptyState 不需要 children |

**影响评估**：低 — Card 组件 API 更宽松，不破坏现有调用（Home/Chat/Create/History/Profile 仍传 children）；EmptyState 用法清晰。

**代码绑定**：
- 修改文件：`apps/web/src/components/Card.tsx` (D50 注解保留)
- 引用处：`apps/web/src/components/EmptyState.tsx`

---

## 三、变更清单（相对原 Tech-Spec）

### 新增文件（相对原 Tech-Spec 第四节 "新增文件" 表格）

| 文件路径 | 功能 | 偏离编号 |
|---------|------|---------|
| `apps/web/tailwind.config.d.ts` | TS 类型声明（为 import tailwindConfig 提供类型） | D-1 |

### 修改文件（相对原 Tech-Spec 第四节 "修改文件" 表格补充）

| 文件路径 | 补充变更内容 | 偏离编号 |
|---------|------------|---------|
| `apps/web/src/test/setup.ts` | 新增 `scrollTo` mock（除原 Spec 的 matchMedia + IntersectionObserver 外） | D-2 |
| `apps/web/src/components/Card.tsx` | `children?` 可选（D50 已记入原 Spec，本文件补充理由） | D-3 |

---

## 四、测试覆盖

3 项偏离全部由 R12 测试覆盖：

| 偏离 | 对应测试 | AC 编号 |
|------|---------|---------|
| D-1 | `App.test.tsx` AC-1201~1205 (token 封闭测试 import tailwindConfig) | AC-1201, 1202, 1203 |
| D-2 | `App.test.tsx` AC-1220 (Create sticky 布局测试触发 scrollTo) | AC-1220 |
| D-3 | `App.test.tsx` AC-1216 (Card children 渲染测试) + AC-1217 (EmptyState opacity-60) | AC-1216, 1217 |

---

## 五、风险评估

| 风险项 | 严重度 | 缓解措施 |
|--------|--------|---------|
| tailwind.config.d.ts 与实际 config 漂移 | 极低 | 简化接口仅暴露测试需要的字段；config 变更时同步 d.ts |
| scrollTo mock 隐藏真实滚动行为 | 低 | mock 仅返回 vi.fn()，不模拟滚动效果；测试只断言布局类名而非滚动位置 |
| Card children 可选导致调用方误用 | 极低 | Card 组件文档注释明确"children 可选，用于内容容器" |

---

## 六、回滚方案

如需回滚偏离项：

1. **D-1 回滚**：删除 `tailwind.config.d.ts`，测试改用 `// @ts-expect-error` 抑制类型错误（牺牲类型安全）
2. **D-2 回滚**：移除 setup.ts 的 scrollTo mock，AC-1220 测试改用 `window.scrollTo` mock 或跳过
3. **D-3 回滚**：Card.tsx 改回 `children: React.ReactNode`（必填），EmptyState 改为传 `<Card>{null}</Card>` 或独立实现

回滚后需重新跑 `pnpm trinity` 验证。

---

## 七、门禁状态

| 门禁 | 状态 | 说明 |
|------|------|------|
| G0 AI-001 Spec-First | ✅ | 本回溯 Spec 同步源码改动，AI-001 合规 |
| G0 AI-002 测试先行 | ✅ | 3 项偏离全部有对应测试 |
| G0 AI-003 越界检测 | ✅ | 3 文件 basename 已在本文件 "三、变更清单" 声明 |
| G3 Tech-Spec | ✅ | 偏离已记入原 Tech-Spec D-1/D-2/D-3 注释 + 本回溯 Spec 详情 |
| G3.5 Spec-Binding | ✅ | 源码含 `// TECH-WEB-D-1` / `// TECH-WEB-D-2` / `TECH-WEB-D50` 注解 |
| G5 trinity | ✅ | typecheck + check-rules + vitest 全绿 |

---

## 八、结论

3 项 Spec 偏离均为实现期技术约束驱动的小幅调整，无功能变更、无架构变更、无安全影响。每项偏离有明确理由 + 拒绝方案 + 测试覆盖 + 风险评估。本回溯 Spec 与原 R12 Tech-Spec 共同构成完整的 Spec-First 合规闭环。

**评审结论**: APPROVED — 偏离合理，文档化完整，可作为后续轮次 "实现期 Spec 偏离处理" 的范例。
