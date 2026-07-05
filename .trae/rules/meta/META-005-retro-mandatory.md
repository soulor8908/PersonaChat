---
rule_id: META-005
title: 复盘必写入
severity: blocking
---

## 规则

每轮迭代结束后，必须运行 `pnpm retro` 更新 lessons-learned.md，并写复盘文档到 `docs/retro/round-{N}.md`。复盘需包含量化指标（AC 完成率/测试覆盖/Blocker 数/结论）和教训条目。

## 触发条件

G7 门禁通过后，合入前触发。

## 期望行为

- 复盘文档存在且包含"教训"段
- lessons-learned.md 由 gen-retro-index.mjs 自动更新
- 每个教训对应至少一条反推（规则/提示词/模板）

## 校验方式

`check-rules.mjs` 分支 `META-005` — 检查 docs/retro/ 下的 round-{N}.md 数量是否 >= 当前轮次数，且 lessons-learned.md 的教训数是否匹配。
