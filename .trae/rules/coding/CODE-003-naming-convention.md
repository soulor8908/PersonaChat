---
rule_id: CODE-003
title: 命名约定
severity: suggestion
---

## 规则
代码命名遵循统一的约定，提高 AI 和人类的可读性。

## 触发条件
创建新文件或新符号时。

## 期望行为
- 文件/目录名：kebab-case（如 `persona-repo.ts`、`chat-svc.ts`）
- 类名：PascalCase（如 `PersonaService`、`ChatRepository`）
- 函数/变量：camelCase（如 `getModelConfig`、`personaService`）
- 常量：UPPER_SNAKE_CASE（如 `MODEL_REGISTRY`、`ErrorCode`）
- 文件名即导出的主要类/函数名（SSOT）

## 校验方式
`check-rules.mjs` 分支 `CODE-003` —— 扫描 `apps/api/src/` 和 `packages/contracts/src/` 下所有 `.ts` 文件，检查文件名是否 kebab-case 且与文件内主要导出类/函数名匹配。
