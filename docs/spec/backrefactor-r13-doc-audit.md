# Backrefactor Spec: R13 文档完整性审计修复

> **类型**: 回溯 Spec (backrefactor) | **触发**: 2026-07-06 文档完整性审计 | **轮次**: R13
>
> **作用**: 覆盖本轮文档审计修复涉及的源码改动（注解修正），使 G0 AI-001/002/003 门禁在 backrefactor 场景下放行。

---

## 一、审计背景

2026-07-06 对 docs/ 下所有 PRD/Tech-Spec/Review/Retro/Delta 文档 + 测试用例 + spec-binding 注解进行全量审计，识别出：

- **P0 问题 5 个**：R8 Tech-Spec 3 个小程序文件路径错误 + R9 Tech-Spec 2 个测试文件声明不存在
- **P1 问题 10 个**：含 R12 spec-binding 格式不规范 + tool-executor.ts 注解 Dx 错误 + check-spec-binding.mjs 校验范围不完整等
- **P2 问题 7 个**：测试用例数过少 + 文档一致性等

详细审计报告见 `docs/retro/round-13.md`（待创建）+ 本文件第二节的偏离详情。

---

## 二、偏离详情

### D-4: R12 Tech-Spec spec-binding 格式不规范

**Spec 原文** (R12 Tech-Spec 第四节变更清单):
```
| `apps/web/src/components/Card.tsx` | ... | `TECH-WEB-D50` |
| `apps/web/src/test/App.test.tsx` | ... | `TECH-WEB-D51` |
| `apps/web/eslint.config.js` | ... | `TECH-WEB-D52` |
| `apps/web/tailwind.config.d.ts` | ... | `TECH-WEB-D-1` (Spec 偏离) |
| `apps/web/src/test/setup.ts` | ... | `TECH-WEB-D-2` (Spec 偏离) |
```

**实现选择**: 统一为 `TECH-XXX-YYY DZZ` 三位数编号格式：
- `TECH-WEB-D50` → `TECH-WEB-011 D50`
- `TECH-WEB-D51` → `TECH-WEB-012 D51`
- `TECH-WEB-D52` → `TECH-WEB-013 D52`
- `TECH-WEB-D-1` → `TECH-WEB-014 D-1`（Spec 偏离编号保留 D-1 格式）
- `TECH-WEB-D-2` → `TECH-WEB-015 D-2`（Spec 偏离编号保留 D-2 格式）

**理由**: G3.5 spec-binding 规范要求 `TECH-XXX-YYY DZZ` 格式（三位数编号 + Dx 引用）。原 `TECH-WEB-D50` 缺少三位数编号，不符合规范。统一格式后便于 check-spec-binding.mjs 正则提取和校验。

**拒绝方案**:
| 方案 | 拒绝理由 |
|------|---------|
| 保留原格式 `TECH-WEB-D50` | 不符合 G3.5 规范，且 check-spec-binding.mjs 正则 `TECH-(\w+)-(\d+)` 要求 WEB- 后跟数字，`D50` 不匹配 |
| 改为 `TECH-WEB-050 D50` | 编号 050 与 Dx 编号 50 重复，语义混淆。用 011 表示"第 11 个 web spec-binding 项"，与 Dx 编号解耦 |

**影响评估**: 仅文档改动，不影响运行时。代码中的 TECH- 注解（如 App.test.tsx 的 `TECH-WEB-012 D51`）同步更新。

**代码绑定**:
- `docs/spec/R12-frontend-style-overhaul.tech.md` 第四节变更清单
- `apps/web/src/test/App.test.tsx:1` 注解
- `apps/web/src/test/setup.ts:1` 注解

---

### D-5: tool-executor.ts 注解 Dx 编号错误

**Spec 原文** (R9 Tech-Spec 第一节 Dx 决策表):
```
| **D18** | Tool Use 循环在 service 层 while loop，最多 5 轮 | ... | `apps/api/src/service/chat-svc.ts` → `chat()` while loop |
| **D19** | 工具执行在 `domain/tool-executor.ts`，不依赖任何外部框架 | ... | `apps/api/src/domain/tool-executor.ts` |
```

**实现选择**: 将 `apps/api/src/domain/tool-executor.ts:1` 的注解从 `TECH-API-015 D18` 修正为 `TECH-API-015 D19`。

**理由**: D18 是 chat-svc.ts 的 while loop 决策，D19 才是 tool-executor.ts 的工具执行决策。原注解标注 D18 属于 Dx 编号错误，违反 G3.5 spec-binding 准确性。

**拒绝方案**:
| 方案 | 拒绝理由 |
|------|---------|
| 保留 D18 注解 | Dx 编号错误，spec-binding 漂移。check-spec-binding.mjs 虽未报错（D18 在 Spec 中存在），但语义错误 |
| 更新 Spec 将 D18/D19 合并 | D18 和 D19 是两个独立决策（service 层循环 vs domain 层执行），合并会丢失决策粒度 |

**影响评估**: 仅注解改动，不影响运行时逻辑。

**代码绑定**: `apps/api/src/domain/tool-executor.ts:1`

---

### D-6: persona-parser.ts + user.ts 历史注解缺口说明

**Spec 原文**: R2 Tech-Spec (persona-crud.tech.md) 变更清单未声明 `persona-parser.ts`；R1 无 Tech-Spec（见 backrefactor-r3-r6-spec-gap.md），`user.ts` 无对应 Dx 决策。

**实现选择**: 在两个文件头部添加说明性注释（非 TECH-XXX-NNN Dxx 格式），记录历史归属和缺口原因。

**理由**:
- `persona-parser.ts` 由 R1 创建，R2 增强 extractName fallback，但 R2 Tech-Spec 变更清单未声明此文件（历史 Spec 缺口）
- `user.ts` 由 R1 创建（含 userModelSchema/userProfileSchema），R1 无 Tech-Spec
- 强行加 TECH-XXX-NNN Dxx 注解会引入 Dx 漂移（无对应 Dx 决策），故用说明性注释替代

**拒绝方案**:
| 方案 | 拒绝理由 |
|------|---------|
| 强行加 TECH-API-016 D1 注解 | D1 是 R2 persona-crud 的 schema 分离决策，与 persona-parser 无关，语义错误 |
| 不加任何注释 | 文件归属不明，后续维护者无法判断是哪个轮次创建的 |

**影响评估**: 仅注释改动，不影响运行时。check-spec-binding.mjs 不提取非 TECH- 格式注释。

**代码绑定**:
- `apps/api/src/domain/persona-parser.ts:1-4`
- `packages/contracts/src/schemas/user.ts:3-6`

---

### D-7: check-spec-binding.mjs 校验范围扩展 + 正则修复

**Spec 原文** (G3.5 门禁定义): "Spec-Sync: Spec 决策编号 Dx ↔ 代码注释 TECH-XXX-001 Dx 双向绑定 — check-spec-binding.mjs"

**实现选择**:
1. 扩展 `srcDirs` 数组，加入 `apps/web/src` + `apps/miniprogram/src`
2. 文件过滤支持 `.ts` + `.tsx` + `.js`（不含 .wxml/.wxss/.json）
3. 修复 Spec Dx 提取正则：`/(?:^|\n)(?:#{1,4}\s*)?D(\d+)[\s:：\-–]+([^\n]+)/gm` → `/\*\*D(\d+)\*\*[\s:：\-–]*([^\n]+)/g`

**理由**:
1. 原校验范围仅含 apps/api/src + packages/contracts/src，23 处 web/miniprogram 的 TECH- 注解不参与 CI 校验，违反 META-003（claim implies enforce）
2. 原正则要求 Dxx 后紧跟 `[\s:：\-–]+`，但 markdown bold 格式 `**D40**` 后是 `**` 不匹配，导致 Spec 决策提取数为 0（check-spec-binding.mjs 实际从未生效）。修复后提取到 36 个 Spec 决策。

**拒绝方案**:
| 方案 | 拒绝理由 |
|------|---------|
| 保持原 2 个目录范围 | 23 处 web/miniprogram 注解无 CI 校验，META-003 违规 |
| 用原正则 + 手动维护 Dx 列表 | 手动维护易漂移，正则修复后可自动提取 36 个 Dx |
| 正则改为匹配所有 D\d+ 格式 | 会误匹配 D-1/D-2 偏离编号和文档中的"D40–D52"范围表达 |

**影响评估**: 脚本改动，校验范围扩大后可能暴露新的漂移错误。经测试，扩展后 0 漂移错误，11 个 warning（缺口检测，非阻断）。

**代码绑定**: `scripts/check-spec-binding.mjs:49-65` (srcDirs + 文件过滤) + `:29-34` (正则)

---

## 三、变更清单

### 修改文件

| 文件路径 | 变更内容 | 偏离编号 |
|---------|---------|---------|
| `apps/api/src/domain/tool-executor.ts` | 注解 D18 → D19（Dx 编号修正） | D-5 |
| `apps/api/src/domain/persona-parser.ts` | 添加历史归属说明注释 | D-6 |
| `packages/contracts/src/schemas/user.ts` | 添加历史归属说明注释 | D-6 |
| `apps/web/src/test/App.test.tsx` | 注解 `TECH-WEB-D51` → `TECH-WEB-012 D51`（格式规范化） | D-4 |
| `apps/web/src/test/setup.ts` | 注解 `TECH-WEB-D-2` → `TECH-WEB-015 D-2`（格式规范化） | D-4 |
| `scripts/check-spec-binding.mjs` | srcDirs 扩展 + 正则修复 | D-7 |

### 新增文件

| 文件路径 | 功能 |
|---------|------|
| `docs/spec/backrefactor-r13-doc-audit.md` | 本文件 — R13 文档审计修复回溯 Spec |

### 删除文件

(无)

---

## 四、测试覆盖

本轮改动为文档/注解/脚本修改，不涉及功能逻辑变更，无需新增测试。现有测试套件应保持全绿（112 tests）。

**验证命令**: `pnpm trinity`（typecheck + check-rules + lint + test）

---

## 五、风险评估

| 风险 | 等级 | 缓解 |
|------|------|------|
| check-spec-binding.mjs 正则修复后可能暴露新的漂移 | 低 | 经测试 0 漂移错误，11 个 warning（非阻断） |
| 校验范围扩大后 web/miniprogram 注解格式不统一 | 中 | 本轮同步修正 App.test.tsx / setup.ts 注解格式；其余注解格式多样化属历史遗留，后续轮次统一 |
| tool-executor.ts 注解改动触发 G0 门禁 | 低 | 本 backrefactor spec 覆盖，G0 AI-001/002/003 在 backrefactor 场景下放行 |

---

## 六、回滚方案

```bash
git revert <round-13-doc-audit-commit-hash>
```

回滚影响：
- check-spec-binding.mjs 回退到原 2 目录范围 + 原正则（Spec 决策提取数回到 0，校验名义通过但实际未生效）
- 注解格式回退（不影响运行时）
- 文档修复（PRD 数据模型草图 / Tech-Spec 段落补齐等）同步回退

---

## 七、门禁状态

| 门禁 | 状态 | 说明 |
|------|------|------|
| G0 AI-001 Spec-First | ✅ advisory pass | 检测到 backrefactor spec，允许重构场景 |
| G0 AI-002 测试先行 | ✅ advisory pass | 源码改动为注解修正，不涉及功能逻辑，无需同步改测试 |
| G0 AI-003 越界检测 | ✅ advisory pass | 源码改动 basename 在本 spec 第三节变更清单中声明 |
| G0 AI-007 E2E 验收 | ✅ advisory pass | 未改动 docs/prd/*.md |
| G3.5 Spec-Binding | ✅ pass | check-spec-binding.mjs 0 漂移错误 |
| G5 trinity | 待验证 | 跑 `pnpm trinity` 确认 |

---

## 八、本轮其他文档修复（非源码改动，不触发 G0）

以下文档修复不涉及功能源码，不触发 G0 门禁，仅记录于此供追溯：

| 文件路径 | 修复内容 |
|---------|---------|
| `docs/prd/R2-persona-domain-complete.md` | 补"数据模型草图"段落（personas + chat_records 表字段定义） |
| `docs/prd/R7-ai-native-experience.md` | 补"数据模型草图"段落（chat_records 扩展 3 字段 + persona_memories 新表 + llm_call_logs 新表） |
| `docs/prd/R9-tool-use.md` | 补"数据模型草图"段落（personas 表新增 tools 字段） |
| `docs/prd/R12-frontend-style-overhaul.md` | 重写 BLOCKING Q&A 段落（原全部"已决定"语义错位，改为 BA 阶段 BLOCKING + review 偏离分表） |
| `docs/spec/R8-marketplace.tech.md` | 修复 3 个小程序文件路径（加 src/ 前缀）+ 补"迁移/回滚方案"段落 + 添加审计回溯注记 |
| `docs/spec/R9-tool-use.tech.md` | 更新审计注记（测试完全缺失，非"散落"） |
| `docs/spec/R10-web-client.tech.md` | 补"contracts 变更"段落（声明无变更） |
| `docs/spec/R12-frontend-style-overhaul.tech.md` | spec-binding 格式修正 + 二次审计注记 |
