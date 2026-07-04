# PersonaChat — AI 人格聊天

## 项目定位

PersonaChat 是**以卡帕西（Karpathy）视角打造的 AI 原生开发示范项目**。项目本身既是产品，也是 Spec-First 工作流的模板。

- **产品**：微信小程序 + Cloudflare Workers 的 AI 人格聊天应用
- **范式**：契约先行（Contract-First）、四层架构、G1-G7 自动门禁、轮次复盘自进化

## 架构

```
PersonaChat/
├── packages/
│   └── contracts/          ← Zod SSOT 契约层
├── apps/
│   ├── api/                ← 后端四层（domain→repository→service→router）
│   └── miniprogram/        ← 微信小程序前端
├── .trae/rules/            ← 机器可校验规则集（16 条）
├── docs/                   ← Spec-First 文档体系
│   ├── workflow/           ← 工作流定义
│   ├── prd/                ← PRD-Spec
│   ├── spec/               ← Tech-Spec
│   ├── retro/              ← 复盘文档
│   └── context-snapshot.md ← 项目快照（自动生成）
└── scripts/                ← 自动化门禁与生成脚本
```

## 开发工作流

每个功能走完 7 阶段流水线，每阶段有不可绕过的质量门禁：

```
需求 → Spec转换 → 测试先行 → 代码生成 → Review → 合入 → 复盘
 G1       G3          G4          G5         G6      G7    反推
```

详见 [docs/workflow/spec-first-workflow.md](docs/workflow/spec-first-workflow.md)

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动后端（开发）
pnpm dev:api

# 运行检查
pnpm test         # 运行测试
pnpm check        # 规则校验
pnpm snapshot     # 生成上下文快照
pnpm retro        # 生成复盘索引

# 部署到 Cloudflare Workers
npx wrangler login        # 仅首次，登录 Cloudflare
pnpm release               # 一键部署（含 D1 建表、密钥设置）
pnpm seed                 # 同步人格数据
```

## 规则

项目内置 16 条机器可校验规则，覆盖：

- **AI 行为**（6 条）：先读 Spec、测试先行、禁止越界、三件套、重构回溯、歧义阻断
- **架构**（3 条）：单向依赖、契约纯净、跨层契约
- **编码**（4 条）：禁止 any、禁止吞错、命名规范、模块边界
- **安全**（3 条）：路由认证、密钥不入仓、输入校验

运行 `pnpm check` 即可自动校验。
