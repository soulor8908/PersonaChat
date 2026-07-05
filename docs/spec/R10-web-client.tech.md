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
