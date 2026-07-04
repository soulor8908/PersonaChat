---
doc_type: prd
id: R2
title: 人格域完整实现 + 可运行验证
version: 1.0
status: approved
---

## 背景

Round 1 搭建了 monorepo 骨架和四层架构，但项目尚未真正运行验证。人格域虽然已有四层结构，但缺少：
1. 批量同步脚本（从 GitHub *-skill 仓库抓取数据）
2. 数据库初始化种子数据
3. 必要的配置文件（sitemap.json 等）
4. 依赖安装和编译验证
5. 单元测试

## 用户故事

- 作为用户，打开小程序能看到人格列表，而不是空页面
- 作为维护者，跑一条命令就能从 GitHub 批量同步人格
- 作为 AI 开发者，有测试覆盖才能安全重构

## 功能点清单

1. **批量人格同步命令** — 从 alchaincyf/*-skill 仓库抓取 SKILL.md，解析后写入 D1
2. **数据库种子数据** — `scripts/seed.mjs` 创建初始数据
3. **项目依赖安装** — `pnpm install` 全量安装，解决 workspace 依赖链
4. **配置补齐** — sitemap.json、migrations/ 目录
5. **单元测试** — contracts schema 测试 + persona-parser 测试 + 路由测试
6. **验证后端可启动** — `pnpm dev` 能在 wrangler 开发服务器下正常运行

## 验收标准

- [ ] `pnpm install` 从根目录执行成功，无报错
- [ ] `node scripts/seed.mjs` 能从 GitHub 批量拉取 10 个人格并写入 D1
- [ ] `vitest run` 全部通过（contracts + persona-parser + 路由）
- [ ] `pnpm dev` 后 `curl /api/health` 返回 200
- [ ] `curl /api/personas` 返回非空列表
- [ ] `pnpm check` 全部通过

## 影响模块

| 模块 | 影响类型 | 说明 |
|------|----------|------|
| apps/api/src/domain/persona-parser.ts | 增强 | 补充 extractName 的 fallback 逻辑 |
| apps/api/src/service/persona-svc.ts | 增强 | 补充 batchSync 方法 |
| scripts/ | 新增 | seed.mjs 批量同步脚本 |
| apps/api/test/ | 新增 | 单元测试 |
| apps/miniprogram/ | 新增 | sitemap.json |

## 边界与异常

| 场景 | 期望行为 |
|------|----------|
| GitHub 仓库不存在或 SKILL.md 缺失 | 跳过该仓库，记录错误，继续同步 |
| SKILL.md 格式不规范（无 System Prompt 段） | 取全文前 4000 字符作为 system prompt |
| 网络超时 | 单个仓库超时 10s，不阻塞整体同步 |
| 重复同步 | UPSERT 逻辑，同名 ID 覆盖更新 |

## 迁移与回滚

无 schema 变更，无需迁移。

## 测试矩阵

| 测试 | 覆盖 | 类型 |
|------|------|------|
| contracts/persona | Schema parse 正确性 | 单元 |
| contracts/chat | Schema parse 正确性 | 单元 |
| persona-parser | extractName / extractSystemPrompt / extractDescription | 单元 |
| persona-parser | 异常输入（空内容、无标题） | 边界 |
