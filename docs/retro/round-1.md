---
round: 1
title: 项目重构为 AI-Native 架构
date: 2026-07-04
status: completed
---

## 目标回顾

将 PersonaChat 从单体结构重构为 AI-Native 架构：monorepo + 契约层 + 四层后端 + 规则体系 + Spec-First 工作流。

## 完成情况

- [x] Monorepo 骨架（root package.json + vitest 配置）
- [x] contracts 包（persona/chat/user/common Schema）
- [x] 后端四层（domain/repository/service/router/middleware）
- [x] 前端 API 客户端和 storage 封装
- [x] .trae/rules/（6 条 AI 行为 + 3 条架构 + 4 条编码 + 3 条安全 = 16 条规则）
- [x] 4 个自动化脚本（check-rules/gen-context-snapshot/gen-round-delta/gen-retro-index）
- [x] 文档体系（workflow + PRD + retro）

## 遇到的问题

1. contracts 的 `.js` 后缀导入在 bundler 模式下需要用 `.js` 扩展名
2. 微信小程序不支持 npm 包直接引用 monorepo workspace 包——API client 需手动维护类型
3. wrangler.toml 路径从 `server/` 移到 `apps/api/`，需更新部署流程

## 教训

- 小程序前端不能直接 import workspace 包，需通过类型声明文件间接享用类型安全
- 规则定义时"校验方式"段要写可脚本化检查的条件，避免纯主观 review
- 四层架构在初期会增加文件数量但降低每文件复杂度——长期收益远大于短期成本

## 反推行动

- [ ] 给 API client 补充 JSDoc 类型标注（从 contracts 手动同步）
- [ ] 部署文档中更新 wrangler 路径
- [ ] Round 2 实现完整人格域功能
