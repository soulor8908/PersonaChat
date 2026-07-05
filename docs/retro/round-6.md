# Round 6 复盘 — Spec-Binding 收尾 + 最终评价

## AC 完成率: 1/1 | 测试: 48/48 | Blocker: 0 | 结论: 通过

## 教训

- **教训**: Spec-Binding D8 漂移（代码引用 D8 但 Spec 无此决策）是"幽灵引用"的典型案例——写代码时顺手标注了 D8，但 Spec 没同步更新。解决：在 Spec 中补充 D8 决策。
- **教训**: 复盘反推机制在快节奏开发中被忽略——6 个 round 只有 Round 1 的复盘是正式写入的。应该每轮结束后立即复盘，而不是攒到最后补。

## 反推

- **规则**: 应增加 META-005 规则"每轮结束后必须运行 gen-retro-index + 更新 lessons-learned"
- **流程**: 工作流文档应在 G7 后增加 G8 门禁 "复盘已写入 docs/retro/round-{N}.md"
