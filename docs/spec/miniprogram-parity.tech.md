# Tech-Spec: 小程序功能对齐 Web 端 (Round 11)

> **角色**: Tech Lead | **状态**: 回溯补齐 | **对应 PRD**: R11-miniprogram-parity.md

---

## 一、架构决策 (D1–D7)

| Dx | 决策 | 理由 | 代码绑定 |
|----|------|------|---------|
| **D1** | 热门推荐使用已有 JS 方法 + WXML 渲染，不创建新数据结构 | 后端 `PersonaApi.listHot()` 已返回完整数据（name, messageCount, likeRate），前端只需用 `Array.map()` + 模板绑定即可。创建中间层 DTO 会增加维护成本，且小程序无 TypeScript 类型系统，额外 DTO 无编译期收益。 | `index.js:44-48` → `loadHot()` 直接 `res.data || []` 赋值 |
| **D2** | 热门区域使用 `wx:if` 守卫而非 CSS `display:none` | `wx:if` 在条件为 false 时完全移除 DOM 节点，减少 WXML 节点树深度（小程序性能敏感）。`display:none` 仍保留 DOM，占用 ID 并增加 setData diff 成本。当 `hotPersonas.length === 0` 时零 DOM 开销。 | `index.wxml:17` → `wx:if="{{hotPersonas.length > 0}}"` |
| **D3** | 停止按钮使用条件渲染（`wx:if` 切换发送/停止）而非始终存在 | 发送按钮和停止按钮互斥：`loading` 为 true 时用户只能停止，false 时只能发送。两个按钮用 `wx:if` 切换渲染避免样式重叠和事件冲突，逻辑清晰。始终存在的方案需要额外状态管理判断可见性。 | `chat.wxml:66-67` → `wx:if="{{!loading}}"` 发送 / `wx:if="{{loading}}"` 停止 |
| **D4** | API Key 使用 `wx.setStorageSync` 持久化到本地存储，而非 `globalData` | `globalData` 在微信小程序中随进程生命周期——用户切后台或重启小程序后丢失。`wx.setStorageSync` 持久化到用户设备，下次打开仍然存在。`globalData` 适合会话级临时数据（如当前 userId）。 | `profile.js:27` → `wx.setStorageSync('api_key', ...)`；`client.js:10` → `wx.getStorageSync('api_key')` |
| **D5** | x-api-key 采用每次请求时 `wx.getStorageSync` 读取，而非启动时缓存到变量 | 用户在设置页修改 Key 后无需重启或重进页面，下次请求自动携带新 Key。缓存策略需要额外同步机制（如设置页发送事件通知）。从本地存储读取的 I/O 开销在小程序运行时是可忽略的。 | `client.js:10-11` → 每次 `request()` 内读取 |
| **D6** | 历史分组标题使用 `chat.personaName || key` 降级策略 | `personaName` 是后端返回的可读名称，但旧数据可能缺失该字段。`|| key` 确保已有数据（personaId）作为 fallback 显示，不会出现空白标题。空字符串 `''` 也是 falsy，同样降级。 | `history.js:46` → `personaName: chat.personaName || key` |
| **D7** | 骨架屏（`loading && personas.length === 0`）优先级高于空状态 | 骨架屏仅在"首次加载且无数据"时显示，一旦有任何数据（即使是旧数据的 pull-to-refresh）则不会遮挡已有列表。空状态在 `!loading && length === 0` 时显示，两者互斥、状态清晰。 | `index.wxml:91`（骨架屏条件）与 `index.wxml:85`（空状态条件） |

### 拒绝方案

| 方案 | 拒绝理由 |
|------|---------|
| D2 alt: `wx:if` 用 CSS `hidden` 属性 | `hidden` 在微信小程序中绑定布尔值，但效果等价于 `display:none`，保留 DOM 节点。与 D2 权衡后选择 `wx:if`。 |
| D3 alt: 一个按钮通过条件切换 `className` 和 `bindtap` 回调 | 小程序模板中不支持在同一个 view 上根据条件切换 bindtap 处理器（需用 `data-*` 判断）。两个独立 view 更简单可靠。 |
| D4 alt: `wx.setStorageSync` 加密存储 | 小程序运行在客户端，加密密钥同样存储在客户端，不能真正防篡改。HTTP 全程走 HTTPS，Key 在传输层安全。增加加密只带来虚假安全感。 |
| D5 alt: 启动时读一次 Key 缓存到 JS 变量 | 用户修改 Key 后需手动重启或额外的事件通知机制。当前方案代码简洁且 I/O 开销可忽略。 |
| D6 alt: 服务端返回时自动填充 personaName | 历史数据由 API 返回，修改服务端逻辑影响范围广。前端 fallback 一行代码解决，向后兼容。 |
| D7 alt: 骨架屏用 CSS 动画模拟卡片形状 | 当前方案使用 spinner + 文字已足够传达"加载中"状态。复杂骨架屏动画增加 WXSS 体积且无功能增益。 |

---

## 二、contracts 变更

**无变更。**

本轮的 9 个功能全部属于小程序前端 UI/UX 对齐，不涉及后端数据模型变更。所有数据使用已有 API 返回的 JSON 结构：
- `PersonaApi.listHot()` → 已有 `/api/personas/hot` 端点
- `PersonaApi.list({ sort })` → 已有 `/api/personas` 端点，`sort` 参数已支持
- `ChatApi.sendStream()` → 已有 `/api/chats/stream` SSE 端点
- `ChatApi.getHistory()` → 已有 `/api/chats/:userId` 端点

小程序端不 import `packages/contracts` 中的任何 Zod schema（遵循 ARCH-003：小程序只通过 HTTP API 通信）。

---

## 三、错误码定义

**无新增错误码。**

本轮不涉及后端 API 新增，错误码复用已有方案（HTTP 状态码 + `res.data.error` 描述）。

---

## 四、变更清单

### 新增文件

| 文件路径 | 功能 |
|---------|------|
| (无) | 所有变更为原地修改，无新增文件 |

### 修改文件

| 文件路径 | 变更内容 | 行数 |
|---------|---------|------|
| `apps/miniprogram/src/pages/index/index.wxml` | 添加热门推荐区块（`hot-section`）、排序按钮（`sort-bar`）、创建入口按钮、骨架屏（`loading-skeleton`）、空状态（`empty-state`）、卡片统计信息（`persona-stats`）；移除旧版文本 loading/empty | 95 |
| `apps/miniprogram/src/pages/index/index.js` | 添加 `hotPersonas` state、`loadHot()` 方法、`sortOptions` 数据、`onSortTap()`/`onCreateTap()` 处理器；`loadPersonas()` 增加 `sort` 参数传递、`categoryLabel` 映射、`likePercent` 计算 | 94 |
| `apps/miniprogram/src/pages/index/index.wxss` | 添加所有新组件样式：搜索栏、创建入口渐变按钮、热门推荐卡片、排序按钮、分类标签（含 active 态）、骨架屏 spinner 动画（`@keyframes spin`）、空状态图标 | 249 |
| `apps/miniprogram/src/pages/chat/chat.wxml` | 添加工具状态指示器（`msg-tool-status`）、停止按钮（`stop-btn`）；发送/停止按钮互斥渲染 | 69 |
| `apps/miniprogram/src/pages/chat/chat.js` | 添加 `onStop()` 方法（`_streamTask.abort()` + 占位消息清理）；`onSend()` 保存 `_streamTask`；添加 `onToolStart`/`onToolEnd` 回调处理 `toolStatus`；`onError` 增加 API Key 提示 | 274 |
| `apps/miniprogram/src/pages/chat/chat.wxss` | 添加 `stop-btn` 红色样式、`msg-tool-status` 橙黄色样式 | 172 |
| `apps/miniprogram/src/pages/profile/profile.wxml` | 添加 API Key 配置表单（password 输入框 + 保存按钮 + 提示文字） | 82 |
| `apps/miniprogram/src/pages/profile/profile.js` | 添加 `apiKey`/`saved` state、`onApiKeyInput()`/`onSaveApiKey()` 方法；`onLoad` 时从 storage 回填 Key | 74 |
| `apps/miniprogram/src/pages/profile/profile.wxss` | 添加 `save-btn` 渐变按钮、`form-hint` 提示文字、`form-input` 输入框样式 | 204 |
| `apps/miniprogram/src/pages/history/history.js` | 分组标题使用 `chat.personaName || key` 替代纯 `personaId` | 104 |
| `apps/miniprogram/src/api/client.js` | `request()` 函数添加 `x-api-key` 请求头注入（`wx.getStorageSync('api_key')` → `header['x-api-key']`） | 162 |

### 未变更（但值得注意）

| 文件 | 说明 |
|------|------|
| `src/lib/storage.js` | API Key 直接使用 `wx.setStorageSync('api_key', ...)`，未通过 Storage 封装。这是因为 API Key 在 `client.js` 中也需要读取，如果通过 Storage 封装会产生间接依赖。 |

---

## 五、迁移/回滚方案

### 迁移

本轮为纯前端变更，无数据库迁移或后端部署需求。只需以下步骤：

1. 将修改后的小程序代码提交至代码仓库
2. 在微信开发者工具中点击"上传"发布新版本
3. 用户下一次打开小程序时自动更新（微信小程序静默更新机制）

### 回滚

若新版本出现问题，回滚方案：

```bash
# 方案一：通过 git revert
git revert <round-11-commit-hash>

# 方案二：在微信小程序管理后台选择上版本发布
# 路径：微信公众平台 → 版本管理 → 选择上一版本 → "选为发布版本"
```

回滚影响范围：
- 用户回到旧版 UI：热门推荐、排序按钮、骨架屏、工具状态、API Key 配置等功能消失
- API 请求不再携带 `x-api-key` 头（不影响无 Key 用户的现有功能）
- 历史分组标题回退为显示 `personaId`
- **所有回滚可逆，不影响后端数据**

---

## 六、测试策略

### 约束说明

小程序前端无法使用 vitest 测试（微信小程序自定义 WXML/WXSS/JS 运行时环境，不支持 Node.js DOM 模拟）。测试策略如下：

| 测试类型 | 方法 | 覆盖功能 |
|---------|------|---------|
| **手动验收** | 使用微信开发者工具 + 真机调试，逐条验证 AC | F1–F9 全部操作路径 |
| **开发者工具 Network 面板** | 检查请求头是否携带 `x-api-key` | F8 |
| **Console 断点调试** | 在 `onStop()`、流式回调等关键函数设断点 | F6 |
| **边界条件模拟** | 网络模拟面板设置 offline 或 5xx，检查错误路径 UI | F1, F2, F6, F7 |
| **存储模拟** | `Storage` 面板手动清除 `api_key`，验证空值行为 | F7, F8 |
| **数据模拟** | 后端返回空数组/缺失字段，验证 UI 正确响应 | F1, F3, F5, F9 |
| **竞态测试** | 快速多次切换排序，验证 UI 最终状态正确 | F2 |

### 关键测试场景

```
F1 (热门推荐):
  ✓ 热门列表有数据 → 可见水平滚动卡片
  ✓ 热门列表为空 → 整块隐藏（DOM 中无 hot-section）
  ✓ loadHot() 失败 → 静默隐藏，不阻塞首页

F2 (排序按钮):
  ✓ 点击"最新" → activeSort 切换为 recent，列表重新加载
  ✓ 快速连续点击不同排序 → 最后一次请求生效

F5 (骨架屏 + 空状态):
  ✓ loading=true + personas.length=0 → 显示骨架屏
  ✓ loading=false + personas.length=0 → 显示空状态
  ✓ loading=true + personas.length>0 → 两者均隐藏，保留列表

F6 (工具状态 + 停止):
  ✓ 收到 tool_start 事件 → 消息下方显示"🔧 toolName..."
  ✓ 收到 tool_end 事件 → 状态文字消失
  ✓ loading=true → 发送按钮消失，停止按钮出现
  ✓ 点击停止 → 调用 abort()，清理占位消息，loading=false

F7 (API Key 配置):
  ✓ 保存 Key → wx.setStorageSync 写入，Toast 提示
  ✓ 重新进入设置页 → 输入框回填已保存 Key
  ✓ 输入框为 password 类型

F8 (x-api-key 请求头):
  ✓ Storage 中有 Key → 所有请求携带 x-api-key 头
  ✓ Storage 中无 Key → 不携带该头

F9 (历史分组标题):
  ✓ personaName 存在 → 显示 personaName
  ✓ personaName 为 undefined/null/'' → 显示 personaId
```
