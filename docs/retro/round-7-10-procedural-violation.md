# 复盘: Round 7-10 流程违规

> **轮次**: Round 7-10 | **日期**: 2026-07-05 | **严重度**: P0 流程违规

---

## 一、违规事实

Round 7-10 共 4 个轮次的开发**完全跳过了 Spec-First 工作流**：

| 违规项 | 违反规则 | 影响范围 |
|--------|---------|---------|
| 未写 PRD 直接编码 | AI-001 | Round 7-10 全部 |
| 未写 Tech-Spec | AI-001 | Round 7-10 全部 |
| 未走 G1/G3/G4 门禁 | AI-004, AI-007 | Round 7-10 全部 |
| 未生成 round-N-delta.md | 工作流约定 | Round 7-10 全部 |
| 未按五角色流程执行 | AGENTS.md | Round 7-10 全部 |

代码已交付（pnpm trinity 全绿、功能可用），但流程文档完全缺失。

## 二、根因分析

### 直接原因
"卡帕西模式"被误解为"快速写代码"。Agent 在 Plan Mode 写出技术方案后，直接跳到编码阶段，跳过了 BA → Tech Lead → test-writer → impl-writer → Reviewer 五角色流程。

### 深层原因
1. **AGENTS.md 缺少流程自查检查项**：当前的 AGENTS.md 列了 13 条"不要做的事"，但没有"开始编码前请确认"的清单
2. **连续多轮快速交付的惯性**：Rounds 7-10 在同一天内连续完成，Agent 进入"流水线模式"，忽略了每轮的质量门
3. **Plan Mode 与 Spec-First 的混淆**：Plan Mode 的设计方案被等同于 PRD+Tech-Spec，但实际上 PRD 需要 BA 角色（需求分析、AC 清单），Tech-Spec 需要 Tech Lead 角色（Dx 决策、架构设计）

### 对比正确流程

| 正确流程 | 本次实际 |
|---------|---------|
| G1: BA 写 PRD → AC 清单 | ❌ 跳过 |
| G3: Tech Lead 写 Tech-Spec → Dx 决策 | ❌ 跳过 |
| G3.5: Spec↔Code 双向绑定 | ❌ 跳过 |
| G4: test-writer 写红色测试 | ⚠️ 测试后补（代码先行） |
| G5: impl-writer 实现 | ✅ 完成 |
| G6: trinity 全绿 | ✅ 完成 |
| G7: Reviewer 审核 | ❌ 跳过 |

## 三、补救措施

1. **回溯补齐 PRD × 4**（已写入 `docs/prd/R7~R10-*.md`）
2. **回溯补齐 Tech-Spec × 4**（已写入 `docs/spec/R7~R10-*.md`）
3. **更新 lessons-learned.md**（追加 4 条教训）
4. **加固 AGENTS.md**（新增"编码前自查清单"，阻断无 Spec 编码）

## 四、反推规则层

### 加固 AGENTS.md
在"接到任务时的第一动作"中增加第 0 步：
```
Step 0: 确认 Spec 存在。如果 docs/prd/ 或 docs/spec/ 下无对应文档 → 拒绝编码，先走 G1→G3。
```

### 新增 AI-008: 轮次完整门禁
每轮完成后必须确认：
- [ ] PRD 文档存在
- [ ] Tech-Spec 文档存在
- [ ] round-N-delta.md 已生成
- [ ] retro/round-N.md 已写入
- [ ] lessons-learned.md 已更新

## 五、教训

| # | 类别 | 教训 |
|---|------|------|
| L17 | 工作流 | Plan Mode ≠ Spec 文档。Plan Mode 输出技术方案，但 PRD 需要 BA 角色、Tech-Spec 需要 Tech Lead 角色，必须分别产出一份独立文档 |
| L18 | 工作流 | 多轮连续交付时容易进入"流水线模式"，每轮开始前必须检查上一轮文档是否完整 |
| L19 | 工作流 | AGENTS.md 的"Step 0"必须是 Spec 存在性检查，不能假设前序流程已完成 |
| L20 | 质量 | 代码和测试可以通过 trinity 验证，但流程合规性目前无人检查——需要自动化门禁 |
