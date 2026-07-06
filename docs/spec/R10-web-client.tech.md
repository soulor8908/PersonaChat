# Tech-Spec: Web 客户端 + PWA (Round 10)

> **角色**: Tech Lead | **状态**: 回溯补齐 | **对应 PRD**: R10-web-client-pwa.md

---

## 一、架构决策 (Dx)

| Dx | 决策 | 理由 | 代码绑定 |
|----|------|------|---------|
| **D20** | React + Vite + Tailwind，新包 `apps/web` | 最主流组合；Vite HMR 快；Tailwind 零 CSS 文件 | `apps/web/vite.config.ts` |
| **D21** | 路由用 HashRouter | 静态 SPA 部署，不依赖服务端路由重写 | `apps/web/src/App.tsx` |
| **D22** | SSE 流式用 fetch + ReadableStream | EventSource 不支持 POST；fetch streaming 通用性强 | `apps/web/src/api/client.ts` → `sendStream()` |
| **D23** | PWA 用 vite-plugin-pwa (Workbox) | 自动生成 SW；precache + API runtime caching 开箱即用 | `apps/web/vite.config.ts` → `VitePWA()` |

### 拒绝方案

| 方案 | 拒绝理由 |
|------|---------|
| D20 alt A: Next.js / Remix SSR | 静态 SPA 部署在 CF Pages，SSR 需 Node 运行时与 CF Workers 不一致。Tailwind + Vite 已能覆盖移动端优先的 SPA 场景。 |
| D20 alt B: Svelte / Solid.js | 生态与招聘市场不如 React 主流；开源模板面向最广用户群。Tailwind 框架无关但 React 生态最成熟。 |
| D20 alt C: 直接复用小程序 WXML 编译为 Web | 微信小程序运行时与 Web 标准存在差异（API、组件名），交叉编译产物体积大且维护成本高。React 重新实现 5 个页面是清晰选择。 |
| D21 alt A: BrowserRouter | 静态部署（CF Pages）需要 fallback 配置（`/* → /index.html`），HashRouter 完全规避服务端依赖，部署最简。 |
| D21 alt B: TanStack Router (类型安全路由) | 类型安全收益显著但增加学习成本；5 个页面的简单 SPA 用 react-router v6 已足够。 |
| D22 alt A: EventSource API | EventSource 仅支持 GET 请求，无法携带 POST body（messages JSON）。fetch + ReadableStream 是当前 W3C 标准的 SSE POST 方案。 |
| D22 alt B: WebSocket | 双向通道对单向推送场景过度；CF Workers 对 WS 支持有限且增加运维复杂度。 |
| D22 alt C: 轮询 `/api/chats/:id/partial` | 同 R7 D8 alt B，延迟高且空请求多。 |
| D23 alt A: 手写 service worker | 手写 SW 需处理 precache 列表、runtime caching 策略、skipWaiting/clientsClaim 生命周期，易出错。Workbox 是 Google 维护的工业级方案。 |
| D23 alt B: 不做 PWA，仅 SPA | PRD AC-1004 明确要求"可安装到桌面"；不引入 SW 则无法 installable。 |
| D23 alt C: Workbox CLI 独立构建 | 与 Vite 构建产物解耦，需独立运行 `workbox wizard`；vite-plugin-pwa 集成进 Vite 构建链，CI 一步到位。 |

---

## 二、包结构

```
apps/web/
├── package.json              # React 18 + Vite 5 + TS + Tailwind
├── tsconfig.json             # strict mode, paths: @/* → src/*
├── vite.config.ts            # VitePWA + proxy /api → CF Workers
├── index.html                # SPA 入口
├── public/favicon.svg
└── src/
    ├── main.tsx              # ReactDOM 挂载
    ├── App.tsx               # HashRouter + 5 routes
    ├── api/client.ts         # fetch 封装 + sendStream()
    ├── components/Layout.tsx  # TabBar 导航
    └── pages/
        ├── Home.tsx           # 人格市场
        ├── Chat.tsx           # 流式聊天
        ├── Create.tsx         # 人格工坊
        ├── History.tsx        # 对话历史
        └── Profile.tsx        # 设置
```

## 三、技术映射 (小程序 → Web)

| 小程序 API | Web 实现 |
|-----------|---------|
| `wx.request` | `fetch()` |
| `wx.request({ enableChunked })` | `fetch() + response.body.getReader()` |
| `wx.navigateTo` | `useNavigate()` |
| `wx.setStorageSync` | `localStorage` |
| `wx.showToast` | 内联 toast state |
| `scroll-view` | `overflow-y: auto` + `scrollTo()` |

## 四、路由设计

| 路径 | 页面 | Dx |
|------|------|----|
| `#/` | Home (人格市场) | D21 |
| `#/chat/:personaId` | Chat (聊天页) | D21,D22 |
| `#/create` | Create (工坊) | D21 |
| `#/history` | History (历史) | D21 |
| `#/profile` | Profile (设置) | D21 |

## 五、PWA 配置

| 配置项 | 值 |
|--------|----|
| display | standalone |
| theme_color | #6366f1 |
| background_color | #0f172a |
| registerType | autoUpdate |
| API caching | NetworkFirst, max 50 entries, 5min TTL |

## 六、构建脚本

根 `package.json`:
```
"dev:web": "pnpm --filter @personachat/web dev"
"build:web": "pnpm --filter @personachat/web build"
```

---

## 七、错误码定义

**无新增错误码。**

Web 前端项目不定义后端错误码，所有错误码沿用后端（apps/api）已定义的 ErrorCode 枚举（1001 NOT_FOUND / 1002 VALIDATION_ERROR / 1003 LLM_STREAM_ERROR / 5000 INTERNAL_ERROR）。前端在 `apps/web/src/api/client.ts` 中按 HTTP 状态码 + response body 的 `code` 字段解析并展示给用户。

前端特有的错误处理（非错误码，属于客户端运行时错误）：

| 客户端错误 | 处理方式 |
|-----------|---------|
| `fetch` 网络失败（offline / DNS） | 内联 toast "网络连接失败，请检查网络" |
| `AbortController.abort()` 触发的流中断 | 静默，不展示错误（用户主动操作） |
| SSE 解析失败（非 `data:` 前缀） | console.warn + 跳过该 chunk |
| `localStorage.setItem` 配额超限 | catch 后降级到内存 Map（仅会话级） |

---

## 八、变更清单

### 新增文件

| 文件路径 | 功能 | Dx |
|---------|------|----|
| `apps/web/package.json` | @personachat/web 包定义；依赖 React/Vite/Tailwind/react-router-dom | D20 |
| `apps/web/vite.config.ts` | Vite + VitePWA + proxy 配置 | D20, D23 |
| `apps/web/tsconfig.json` | strict mode；`@/*` 路径别名 | D20 |
| `apps/web/tsconfig.node.json` | vite.config.ts 的 Node 上下文编译 | D20 |
| `apps/web/index.html` | SPA HTML 入口；引入 main.tsx + root div | D20 |
| `apps/web/public/favicon.svg` | 站点图标（紫色"PC"字母） | D20 |
| `apps/web/postcss.config.js` | Tailwind + autoprefixer 插件链 | D20 |
| `apps/web/tailwind.config.js` | Tailwind 配置（content 扫描 + 暗色主题） | D20 |
| `apps/web/eslint.config.js` | ESLint flat config（含 react-hooks 规则） | D20 |
| `apps/web/vitest.config.ts` | jsdom 环境 + setup.ts | D20 |
| `apps/web/src/main.tsx` | ReactDOM.createRoot 挂载 App | D20 |
| `apps/web/src/App.tsx` | HashRouter + Routes + Layout | D21 |
| `apps/web/src/api/client.ts` | `request()` + `sendStream()` 封装；`x-api-key` 注入 | D22 |
| `apps/web/src/components/Layout.tsx` | TabBar 底部导航 4 项 | D20 |
| `apps/web/src/pages/Home.tsx` | 人格市场；调用 `/api/personas?sort=` | D20, D21 |
| `apps/web/src/pages/Chat.tsx` | 聊天页；SSE 流式渲染 + 停止按钮 | D22 |
| `apps/web/src/pages/Create.tsx` | 人格工坊；表单 + 预览聊天 + 发布 | D20, D21 |
| `apps/web/src/pages/History.tsx` | 对话历史；按 personaId 分组 | D20, D21 |
| `apps/web/src/pages/Profile.tsx` | 设置页；API Key 配置表单 | D20, D21 |
| `apps/web/src/index.css` | Tailwind 入口 + 全局样式 | D20 |
| `apps/web/src/vite-env.d.ts` | Vite 类型声明 | D20 |
| `apps/web/src/test/setup.ts` | jsdom 环境 setup（matchMedia / IntersectionObserver mock） | D20 |
| `apps/web/src/test/App.test.tsx` | App 组件冒烟测试（5 路由可渲染） | D20 |

### 修改文件

| 文件路径 | 变更内容 | 行数 |
|---------|---------|------|
| `package.json` (根) | 新增 `dev:web` / `build:web` 脚本；新增 `@personachat/web` workspace 引用 | - |
| `pnpm-workspace.yaml` | 新增 `apps/web` 到 packages 列表 | - |

### 删除文件

(无)

---

## 九、测试策略

> **约束说明**：R10 是首个 `apps/web` 包的轮次。前端测试面临 L21 风险（前端视觉零防御），因此本轮测试策略在 PRD AC-1001~1005 的手动验收之外，强制引入组件冒烟测试与构建校验。

| 测试类型 | 文件 | 覆盖功能 | AC |
|---------|------|---------|----|
| **冒烟测试** | `apps/web/src/test/App.test.tsx` | 渲染 `<App/>` + 模拟 5 个路由导航 + 断言关键 DOM 节点存在（无 crash） | AC-1001 |
| **构建验证** | `pnpm build:web` | `vite build` 成功生成 dist/；`tsc --noEmit` 无类型错误 | AC-1005 |
| **类型检查** | `pnpm typecheck` | `apps/web/tsconfig.json` strict 模式通过 | AC-1005 |
| **手动 — 流式聊天** | 浏览器 + DevTools Network | 发送消息 → SSE delta 逐字渲染；点击停止 → abort + 已渲染保留 | AC-1002, AC-1003 |
| **手动 — PWA 安装** | Chrome DevTools → Application → Manifest | 满足 installable criteria；地址栏出现安装图标 | AC-1004 |
| **手动 — 路由导航** | 浏览器地址栏 + TabBar | 5 路由切换无白屏；active Tab 高亮 | AC-1001 |

### 关键测试场景

```
AC-1001 (5 页面渲染):
  ✓ App.test.tsx 渲染 <App/>，expect(container).toBeInTheDocument()
  ✓ useNavigate 模拟点击 TabBar 4 项 → 路由切换成功
  ✓ 5 个页面无 React 报错（ErrorBoundary 未触发）

AC-1002 (SSE 流式):
  ✓ 输入框输入"hello" → 点击发送
  ✓ Network 面板看到 POST /api/chats/stream → 200 + text/event-stream
  ✓ body 逐字渲染到消息列表（不等完整响应）
  ✓ done 事件后输入框恢复可用

AC-1003 (停止生成):
  ✓ 流式中点击"停止"按钮 → AbortController.abort()
  ✓ 已渲染的内容保留在消息列表
  ✓ 发送按钮恢复可用，停止按钮消失

AC-1004 (PWA 安装):
  ✓ Chrome → Application → Manifest 显示 name/short_name/icons
  ✓ display: standalone
  ✓ 地址栏右侧出现"安装"图标
  ✓ 点击安装 → 独立窗口打开

AC-1005 (构建):
  ✓ pnpm build:web → exit code 0
  ✓ dist/index.html 生成
  ✓ dist/assets/*.js + *.css 生成
  ✓ sw.js + workbox-*.js 生成（VitePWA）
```

---

## 十、迁移/回滚方案

**无 schema 变更，无需数据库迁移。**

Web 客户端是纯前端项目，与后端 D1 无耦合。部署/回滚仅涉及静态资源：

### 部署步骤

1. `pnpm build:web` 生成 `apps/web/dist/`
2. 部署到 CF Pages（git push 触发自动部署，或 wrangler pages deploy）
3. PWA 用户下次访问时 SW 自动检测更新（registerType: autoUpdate）

### 回滚步骤

```bash
# 方案一：CF Pages 控制台选择上一版本部署
# 路径：Cloudflare Dashboard → Pages → 选中项目 → Deployments → 选上一版本 → Promote to production

# 方案二：git revert + 重新部署
git revert <round-10-commit-hash>
pnpm build:web
wrangler pages deploy apps/web/dist
```

回滚影响：
- 用户已安装的 PWA 在下次启动时检测到 SW 版本回退，需用户手动刷新（autoUpdate 模式下 skipWaiting 自动激活）
- localStorage 中的 API Key 与历史记录保留（前端存储不随部署版本变化）
- 后端 API 无变化，旧版前端可继续调用
