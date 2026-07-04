---
doc_type: prd
id: R1
title: 项目重构为 AI-Native 架构
version: 1.0
status: approved
---

## 背景

PersonaChat 最初为一个快速原型项目，代码结构单一（后端单文件 index.js 180 行），类型定义散落，无共享契约层。随着功能增长，这种结构导致：

1. AI 难以理解代码边界和职责划分
2. 前后端类型不一致，运行时错误频发
3. 门禁缺失，质量依赖人工 review
4. 无法自进化——没有复盘反推机制

## 用户故事

- 作为 AI 开发者，我希望代码结构清晰可预测，以便我能准确生成代码
- 作为人类维护者，我希望有自动门禁拦截错误，而不是靠 review
- 作为项目所有者，我希望每次开发都能积累教训，让项目变得越来越好

## 功能点清单

1. **Monorepo 骨架搭建** — pnpm workspace, packages/contracts, apps/api, apps/miniprogram
2. **Zod 契约层** — 人格/聊天/用户/公共 Schema SSOT
3. **后端四层架构** — domain → repository → service → router
4. **前端类型安全 API 封装** — 集中的 API client
5. **规则体系** — .trae/rules/ AI 行为/架构/编码/安全规则
6. **自动化脚本** — check-rules, gen-context-snapshot, gen-round-delta, gen-retro-index
7. **Spec-First 工作流文档** — 7 阶段流水线定义

## 验收标准

- [x] `packages/contracts` 可被 apps/api import
- [x] 后端四层目录结构完整，依赖方向单向向下
- [x] 所有 API 端点在新架构下可用（health + personas + chat + history）
- [x] `.trae/rules/` 包含至少 12 条规则（AI-001~006, ARCH-001~003, CODE-001~004, SEC-001~003）
- [x] `check-rules.mjs` 能运行并输出检查报告
- [x] `docs/workflow/spec-first-workflow.md` 定义了完整的 7 阶段流水线

## 不确定项

- 旧的 miniprogram 目录和新的 apps/miniprogram 如何共存过渡
