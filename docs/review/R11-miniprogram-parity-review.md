# Round 11 评审报告: 小程序功能对齐 Web 端

> **评审角色**: Reviewer
> **评审日期**: 2026-07-05
> **对应 PRD**: `docs/prd/R11-miniprogram-parity.md`
> **对应 Tech-Spec**: `docs/spec/miniprogram-parity.tech.md`
> **范围**: F1–F9 共 9 个功能，12 个文件修改

---

## 1. 门禁通过状态

| Gate | 状态 | 说明 |
|------|------|------|
| **G1: PRD** | ✅ | PRD 存在，9 个功能均有完整的 Given/When/Then 覆盖正常/边界/错误路径，20 项 AC 清单完整 |
| **G3: Tech-Spec** | ✅ | Tech-Spec 存在，7 条架构决策 (D1–D7) 均有 rationale 和代码绑定路径，拒绝方案有理由 |
| **G3.5: Spec-Binding** | ❌ | **Round 11 新增代码无 spec-binding 注释**。现有注释均为旧有 (D9/D10/D11/D14/D15/D18)，新功能 F1–F9 代码全无 `TECH-API` 或 `Dx` 绑定 |
| **G4: 测试覆盖** | ✅ | `MANUAL_TEST.md` 覆盖全部 20 项 AC (100%)，含正常/边界/错误路径，总计 47 个测试用例。注意：部分测试用例预期结果标记了未实现的兜底（如 TC-F3-06 `messageCount` 显示 `undefined`） |
| **G5: `pnpm trinity`** | ❓ | **未验证** — 无法确认在提交前执行了 `pnpm trinity`。小程序代码为纯 JS/WXSS/WXML，不经过 `tsc`/`vitest`，但 `check-rules.mjs` (CODE-002, SEC-002) 会扫描 `apps/miniprogram` 目录 |
| **G6: check-rules.mjs** | ✅ | 现有 14 项 enforcement 对小程序文件扫描：静默 catch 已加注释绕过检测，无硬编码凭据，无 `eval`/`new Function`。无阻断项 |
| **G7: 代码审核** | ⚠️ | 发现 **2 个 Bug** + **3 个规范问题** (详见下文) |

---

## 2. G7 代码审核 — 逐文件审查

### 2.1 `api/client.js` — F8: API Key 请求头注入

| 问题 | 等级 | 描述 |
|------|------|------|
| `sendStream()` 未携带 `x-api-key` 头 | **BUG** | `request()` 函数 (L6-27) 正确注入了 `x-api-key` 头，但 `sendStream()` (L70-123) 在 `wx.request()` 中使用了独立的 `header: { 'Content-Type': 'application/json' }`，**未复用 `request()` 的头注入逻辑**。这意味着流式请求不会携带 API Key。 |
| 代码 | | |

```javascript
// client.js:75 — 缺少 x-api-key
header: { 'Content-Type': 'application/json' },  // ← 应加入 apiKey 注入
```

**建议**: 将 `request()` 中的 header 构建逻辑提取为公共函数，或让 `sendStream()` 同样读取 `wx.getStorageSync('api_key')`。

### 2.2 `pages/index/index.js` — F2: 排序按钮

| 问题 | 等级 | 描述 |
|------|------|------|
| 排序标签与 PRD 不一致 | **BUG (UI)** | PRD (F2) 和测试计划 (TC-F2-01) 规定三个排序为 "热门"/"最新"/"**好评**"，但代码中 `SORT_OPTIONS` 第三个标签为 "**最多互动**" (`index.js:15`)。 |
| 代码 | | |

```javascript
// index.js:15 — 预期 "好评" 而非 "最多互动"
{ key: 'rated', label: '最多互动' },
```

**影响**: 用户可接受，但验收时 TC-F2-01 的预期结果 ("好评") 与实际 UI ("最多互动") 不匹配。

### 2.3 `pages/index/index.js` — 总体

| 方面 | 评估 |
|------|------|
| F1 `loadHot()` | ✅ 正确使用 `res.data || []` 兜底，静默 catch |
| F2 `onSortTap()` | ✅ 切换 `activeSort` + 调用 `loadPersonas()` |
| F3 卡片统计 | ✅ `likePercent` 计算 `Math.round((p.likeRate || 0) * 100)` 有 `|| 0` 兜底 |
| F4 `onCreateTap()` | ✅ 导航路径正确 |
| 竞态条件 | ⚠️ 未使用防抖或请求取消机制，快速切换排序可能触发竞态。PRD 和测试计划均标记了此风险。 |

### 2.4 `pages/index/index.wxml` — F1~F5

| 方面 | 评估 |
|------|------|
| F1: 热门 `wx:if` | ✅ `wx:if="{{hotPersonas.length > 0}}"` 符合 D2 决策 |
| F2: 排序按钮 | ✅ `activeSort === item.key` 活动态绑定 |
| F3: 卡片统计 | ✅ `messageCount`, `likeRate%`, `tools.length` 正确展示 |
| F4: 创建入口 | ✅ `bindtap="onCreateTap"` 绑定正确 |
| F5: 骨架屏/空状态 | ✅ `loading && personas.length === 0` / `personas.length === 0 && !loading` 状态互斥 |

### 2.5 `pages/index/index.wxss` — 样式

| 方面 | 评估 |
|------|------|
| 创建按钮渐变 | ✅ `linear-gradient(135deg, #667eea, #764ba2)` |
| 热门卡片 | ✅ 水平布局，`white-space: nowrap` |
| 排序按钮 | ✅ `active` 态 `#667eea` 紫色文字 + `#f0f0ff` 浅紫背景 |
| 骨架屏 spinner | ✅ `@keyframes spin` 旋转动画 |
| 空状态图标 | ✅ `opacity: 0.4` 半透明 |

### 2.6 `pages/chat/chat.js` — F6: 工具状态 + 停止按钮

| 方面 | 评估 |
|------|------|
| `onStop()` | ✅ 检查 `_streamTask` 非空后 `abort()`，清理占位消息，设 `loading=false` |
| `onToolStart` | ✅ 标签映射 (calculator/current_time/web_search) |
| `onToolEnd` | ✅ 清除 `toolStatus` |
| `onError` API Key 提示 | ✅ 检查 `msg.includes('API key')` 给出友好提示 |
| 异常安全 | ⚠️ `onStop()` 未包裹 `try-catch`，若 `abort()` 抛出异常则后续清理不执行 (PRD 已预见到此风险) |

### 2.7 `pages/chat/chat.wxml` — F6

| 方面 | 评估 |
|------|------|
| `msg-tool-status` | ✅ `wx:if="{{item.toolStatus}}"` 仅在状态非空时显示 |
| 停止按钮 | ✅ `wx:if="{{loading}}"` / `wx:if="{{!loading}}"` 互斥渲染 |
| 停止按钮绑定 | ✅ `bindtap="onStop"` |

### 2.8 `pages/chat/chat.wxss`

| 方面 | 评估 |
|------|------|
| `.stop-btn` | ✅ 红色 `#ff6b6b` |
| `.msg-tool-status` | ✅ 橙黄色 `#f0ad4e`，22rpx 字号 |

### 2.9 `pages/profile/profile.js` — F7: API Key 配置

| 方面 | 评估 |
|------|------|
| `onLoad` 回填 | ✅ `wx.getStorageSync('api_key') || ''` |
| `onSaveApiKey` | ✅ `wx.setStorageSync` + Toast + 按钮文字切换 + 2s 恢复 |
| 异常安全 | ⚠️ `wx.setStorageSync` 未包裹 `try-catch` (极低概率存储空间不足时抛出) |
| 高频点击 | ⚠️ `setTimeout` 非幂等，连续快速保存可能导致 timer 重置动画 |

### 2.10 `pages/profile/profile.wxml` — F7

| 方面 | 评估 |
|------|------|
| API Key 输入框 | ✅ `password` 属性，`bindinput="onApiKeyInput"` |
| 保存按钮 | ✅ 文字绑定 `{{saved ? '已保存 ✓' : '保存'}}` |
| 提示文字 | ✅ "用于访问 PersonaChat API 的认证密钥" |

### 2.11 `pages/profile/profile.wxss`

| 方面 | 评估 |
|------|------|
| `.save-btn` | ✅ 渐变紫色按钮 |
| `.form-hint` | ✅ 灰色提示文字 22rpx |

### 2.12 `pages/history/history.js` — F9: 分组标题修复

| 方面 | 评估 |
|------|------|
| 分组标题 | ✅ `chat.personaName || key` 降级策略匹配 D6 决策 |
| 影响范围 | ✅ 单行修改，向后兼容 |

### 2.13 `pages/create/create.js`

| 方面 | 评估 |
|------|------|
| 变更 | ✅ 从 `void (_e as Error)` (TypeScript cast) 改为 `/* catch silently */` 注释，与代码库风格一致 |

---

## 3. 问题清单

### 3.1 Bug

| ID | 文件 | 行 | 严重度 | 描述 |
|----|------|-----|--------|------|
| **B1** | `api/client.js` | 75 | **高** | `sendStream()` 使用独立 `header` 对象，未注入 `x-api-key`。流式 API 请求不携带认证头。 |
| **B2** | `pages/index/index.js` | 15 | **低** | 排序标签 "最多互动" 与 PRD/测试计划规定的 "好评" 不匹配。 |

### 3.2 可靠性

| ID | 文件 | 行 | 严重度 | 描述 |
|----|------|-----|--------|------|
| **R1** | `pages/chat/chat.js` | 177 | **中** | `onStop()` 无 `try-catch`，`abort()` 若抛出异常则清理逻辑和 `loading=false` 不执行。 |
| **R2** | `pages/profile/profile.js` | 27 | **低** | `wx.setStorageSync` 未捕获异常 (极低概率)。 |

### 3.3 规范/质量

| ID | 文件 | 严重度 | 描述 |
|----|------|--------|------|
| **S1** | 所有 Round 11 新增代码 | **中** | **缺少 spec-binding 注释**。F1–F9 代码中无 `TECH-API`/`Dx` 绑定标注，不符合 G3.5 要求。具体需补充：`client.js:73` (`sendStream` → D3/D5)、`index.js:44, 82` (F1/F2 → D1/D2)、`index.wxml:17, 91` (D2/D7)、`chat.js:176` (D3)、`profile.js:18-30` (D4/D5)、`history.js:46` (D6)。 |
| **S2** | `pages/index/index.js` | **低** | 排序切换无防抖或请求取消。快速切换场景下竞态未被防御 (PRD 已预见到此风险)。 |

---

## 4. 结论

**评审结论: CONDITIONAL**

### 条件 (必须在合并前修复)

1. **[B1] 高** — 修复 `api/client.js:75`，让 `sendStream()` 也注入 `x-api-key` 请求头。
2. **[S1] 中** — 为所有 Round 11 新增代码补充 `TECH-API`/`Dx` spec-binding 注释。

### 建议 (可后续迭代修复)

3. **[B2] 低** — 将排序标签 "最多互动" 统一为 "好评" 以匹配 PRD 和测试计划。
4. **[R1] 中** — 为 `onStop()` 添加 `try-catch` 包裹 `abort()`，确保异常时也能完成清理。
5. **[R2] 低** — 为 `wx.setStorageSync` 添加 `try-catch` 兜底。

### 总评

本轮对齐 (F1–F9) 整体质量良好。PRD 全面、Tech-Spec 决策清晰、手动测试计划覆盖完整。核心问题是 **B1 (sendStream 缺少 API Key 头)** — 这直接影响 F8 功能的正确性。**S1 (缺少 spec-binding 注释)** 属于质量流程问题，需补充以维持代码与文档的可追溯性。

**批准条件**: B1 + S1 修复完成后，本轮可正式 APPROVED。
