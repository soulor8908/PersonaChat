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

## 四、验收标准

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-1001 | 浏览器访问 Web 应用 | 浏览 5 个页面 | 所有页面可正常渲染，导航流畅 |
| AC-1002 | 聊天页输入消息 | 发送 | SSE 流式逐字渲染，无白屏等待 |
| AC-1003 | 点击停止按钮 | 中断 SSE 流 | 停止生成，已渲染内容保留 |
| AC-1004 | PWA 已部署 | 浏览器提示"安装" | 可安装到桌面，独立窗口运行 |
| AC-1005 | `pnpm build:web` | 构建完成 | 无编译错误，生成 dist 目录 |

## 五、测试映射

- 通过手动验收 + `pnpm typecheck` (apps/web 通过 `tsc --noEmit`)
- `pnpm build:web` 成功即构建验证通过
