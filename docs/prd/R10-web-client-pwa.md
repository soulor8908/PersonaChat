# PRD: Web 客户端 + PWA (Round 10)

> **角色**: BA | **状态**: 回溯补齐 | **对应实现**: Round 10 (已交付)

---

## 一、需求背景

PersonaChat 目前只有微信小程序客户端，限制了用户触达范围。作为开源 AI 聊天模板，需要一个标准化的 Web 客户端参考实现，支持 PWA 可安装、跨平台访问。

## 二、用户故事

| ID | 故事 |
|----|------|
| US-1001 | 作为用户，我希望在浏览器中直接使用 PersonaChat，不需要微信 |
| US-1002 | 作为用户，我希望把 PersonaChat 安装到手机桌面，像原生 App 一样使用 |
| US-1003 | 作为用户，我希望 Web 版功能与小程序版一致 |
| US-1004 | 作为开发者，我希望 Web 客户端完全复用 contracts 类型定义 |

## 三、功能需求

### F1: Web SPA 应用
- 新建 `apps/web` 包：React 18 + Vite 5 + TypeScript + Tailwind CSS
- 5 页面：Home(人格市场) / Chat(聊天) / Create(工坊) / History(历史) / Profile(设置)
- React Router v6 HashRouter 路由
- fetch API 客户端，类型安全调用后端

### F2: SSE 流式聊天
- `fetch()` + `response.body.getReader()` 实现流式接收
- 解析 delta/tool_start/tool_args/tool_end/done/error 事件
- 支持停止生成（AbortController）

### F3: PWA
- vite-plugin-pwa 自动生成 service worker
- manifest.json：可安装到桌面/主屏幕
- Workbox precache 静态资源 + API runtime caching (NetworkFirst)

### F4: 响应式布局
- 移动端优先，max-w-lg 居中
- 底部 TabBar 导航（人格库/对话/创建/设置）
- Tailwind 暗色主题

### Out of Scope

| 条目 | 原因 |
|------|------|
| SSR / SSG | 本轮为 SPA，SSR 在 R12+ 评估 |
| i18n 多语言 | 非本轮范围 |
| 暗色主题切换器 | R12 才系统化处理 |
| 离线模式（无网络可用） | PWA 缓存只读，离线发消息不支持 |
| 浏览器 push notification | 非本轮范围 |
| 桌面端专属布局（> 1024px） | 移动端优先，桌面端直接放大使用 |
| E2E 自动化测试（Playwright/Cypress） | 本轮仅冒烟测试，自动化 E2E 在后续轮次 |
| WebRTC 等浏览器独有 API | 与小程序对齐，不引入 Web 独有能力 |

## 四、验收标准 (AC)

### AC-F1: Web SPA 应用

#### 正常路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-1001a | Web 应用已部署 | 浏览器访问 `#/` | Home 页面渲染，可看到人格列表 |
| AC-1001b | Home 页面点击人格卡片 | 触发 useNavigate | 跳转至 `#/chat/:personaId` |
| AC-1001c | 浏览器访问 `#/create` | HashRouter 解析 | Create 页面渲染，表单可用 |
| AC-1001d | 浏览器访问 `#/history` | HashRouter 解析 | History 页面渲染 |
| AC-1001e | 浏览器访问 `#/profile` | HashRouter 解析 | Profile 页面渲染，含 API Key 输入框 |

#### 边界条件

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-1001f | 浏览器直接访问未知 hash（如 `#/unknown`） | HashRouter 解析 | 跳转至默认页（Home）或显示 404 |
| AC-1001g | localStorage 中无 API Key | 进入 Profile 页 | 输入框为空，提示输入 |

#### 错误路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-1001h | 后端 API 不可达 | 加载 Home 页 | 显示错误状态/重试按钮，不白屏 |

### AC-F2: SSE 流式聊天

#### 正常路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-1002a | 聊天页输入消息 + 发送 | fetch + ReadableStream | SSE 流式逐字渲染，无白屏等待 |
| AC-1002b | 流式收到 delta 事件 | 累积渲染 | 消息气泡逐步增长 |
| AC-1002c | 流式收到 done 事件 | 流结束 | 消息定稿，可再次发送 |

#### 边界条件

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-1002d | 流式收到 tool_start/tool_end | 状态指示器 | 显示 "🔧 toolName..." 状态文字 |
| AC-1002e | 用户点击停止按钮 | AbortController.abort() | 中断 SSE 流，已渲染内容保留 |

#### 错误路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-1002f | 后端返回 4xx/5xx | fetch 解析 | 显示错误 toast，输入可重试 |
| AC-1002g | SSE 解析失败（非 JSON 行） | 跳过该 chunk | 不中断流，继续等待下一 chunk |

### AC-F3: PWA

#### 正常路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-1003a | PWA 已部署 + 浏览器支持 | 浏览器提示"安装" | 可安装到桌面，独立窗口运行 |
| AC-1003b | manifest.json 已生成 | 检查 | 含 name/short_name/icons/theme_color/start_url |

#### 边界条件

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-1003c | 首次访问 + 网络通畅 | service worker 注册 | 静态资源被 precache，二次访问秒开 |
| AC-1003d | 离线访问已缓存页面 | service worker 响应 | 缓存命中，页面可打开（API 调用失败时降级提示） |

#### 错误路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-1003e | service worker 注册失败（HTTPS 缺失） | 浏览器控制台 | 报 warning，应用仍可用（仅失去 PWA 能力） |

### AC-F4: 响应式布局

#### 正常路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-1004a | 移动端（< 768px）访问 | 渲染 | 底部 TabBar 可见，max-w-lg 居中 |
| AC-1004b | 暗色主题默认开启 | 渲染 | 背景为暗色，文字为浅色 |

#### 边界条件

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-1004c | 安全区（iPhone 刘海/底部） | 渲染 | TabBar 使用 `pb-[env(safe-area-inset-bottom)]` 适配 |

#### 错误路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-1004d | 浏览器不支持 env(safe-area-inset-*) | 渲染 | 降级为 0，TabBar 仍可见（可能略微贴底） |

### AC-F5: 构建验证

#### 正常路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-1005a | `pnpm build:web` 运行 | 构建 | 无编译错误，生成 dist 目录 |

#### 边界条件

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-1005b | TypeScript 严格模式 | `tsc --noEmit` | 无类型错误 |

#### 错误路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-1005c | contracts 类型变更（如 R9 新增 tool 字段） | 构建 | TypeScript 报错并阻止构建（早期发现） |

## 五、测试映射

> **AI-002 测试先行要求**：R10 在 `apps/web/src/test/App.test.tsx` 中维护页面冒烟测试（FRONTEND-001 要求每个页面组件至少 2 个断言）。

| PRD AC | 测试文件 | 测试用例 | 类型 |
|--------|---------|---------|------|
| AC-1001a | `apps/web/src/test/App.test.tsx` | "渲染所有导航标签" + Home 页"渲染搜索输入框" | 冒烟 |
| AC-1001c | `apps/web/src/test/App.test.tsx` | Create 页"渲染创建表单元素" + "名称为空时发布按钮禁用" | 冒烟 |
| AC-1001d | `apps/web/src/test/App.test.tsx` | History 页"渲染标题" + "空历史显示空状态" | 冒烟 |
| AC-1001e | `apps/web/src/test/App.test.tsx` | Profile 页"渲染设置标题和区域" + "渲染页脚版本信息" + "显示可用模型列表" | 冒烟 |
| AC-1001b / AC-1002a ~ AC-1002g | （手动验收） | 浏览器手动验证 | 集成 |
| AC-1003a ~ AC-1003e | （手动验收） | PWA 安装 + service worker 行为 | 集成 |
| AC-1004a ~ AC-1004d | `apps/web/src/test/App.test.tsx` | "导航栏使用正确的安全区 class" + "当前路径对应标签高亮" | 冒烟 |
| AC-1005a | `pnpm build:web` | 构建无报错 | 集成 |
| AC-1005b | `pnpm typecheck` | TypeScript 类型检查 | 静态 |

## 六、BLOCKING Q&A

> 以下为 BA 在编写 PRD 过程中发现的歧义或缺失信息，需要相关方确认后方可推进后续轮次。

### Q1: PWA 缓存策略 — 静态资源与 API 各用什么策略？

**问题**: Workbox 默认 precache 静态资源（构建产物 hash 命名），但 API 调用是动态的。API runtime caching 用 NetworkFirst 还是 StaleWhileRevalidate？缓存命中时是否优先返回缓存（牺牲实时性换速度）？API 缓存的 TTL 是多少？聊天 SSE 流是否走缓存（不应走）？

**建议确认方**: 前端开发 / 后端开发

### Q2: API 代理在 production 如何部署？小程序与 Web 的 base URL 是否一致？

**问题**: 开发环境用 Vite proxy (`/api → http://localhost:8787`)，但生产环境 Web 部署后如何与 CF Workers 后端通信？是同域部署（CF Pages + Workers Routes）还是跨域（CORS）？小程序的 base URL（如 `https://api.personachat.dev`）与 Web 端是否一致？API Key 在 Web 端如何安全存储（localStorage 有 XSS 风险）？

**建议确认方**: 前端开发 / 运维 / 安全负责人
