# Round 4 复盘 — Chat DELETE + 前端 SSOT

## AC 完成率: 2/2 | 测试: 48/48 | Blocker: 0 | 结论: 通过

## 教训

- **教训**: 前端 `modelKeys: ['deepseek-v3', ...]` 硬编码与 contracts 不同步——后端增删模型前端不会自动感知。解决方案是 `GET /api/models` 从 SSOT 下发，前端 API 动态获取 + local fallback。
- **教训**: Spec-Binding 从 0→7 决策是质的飞跃，但 `D#:` 注释格式与 regex 的 `(?:\s|$)` 不兼容——冒号后面直接跟中文导致 regex 无法匹配。修正为 `(?::|\s|$)` 解决。

## 反推

- **规则**: 应增加 FRONTEND-001 规则"前端可变集合从 API 获取，不硬编码"
- **提示词**: BA 应明确"API 端点应包含列表配置下发端点"
- **模板**: PRD 应包含"前端依赖的配置数据从哪个 API 获取"
