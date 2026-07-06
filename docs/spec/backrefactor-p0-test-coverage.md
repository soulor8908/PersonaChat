# P0 测试覆盖回溯 Spec

## 背景
为 PersonaChat API 层添加完整的单元测试覆盖，原 API 21 个源文件零自动测试。

## 变更
- 新增测试文件：domain/*.test.ts (4), middleware/*.test.ts (6), service/*.test.ts (3), router/*.test.ts (3)
- 新增测试工具文件：service/__chat-test-utils.ts (共享 mock 辅助函数)
- 总测试数：248 个测试覆盖领域/中间件/服务/路由四层

## Dx 决策
- Dx-TEST-001: 测试从领域层→中间件→服务→路由自底向上编写
- Dx-TEST-002: Service 层测试统一使用 vi.mock() 模拟 LLM 域模块 + 共享 mock helper
- Dx-TEST-003: 路由层测试使用 Hono app.request() 端到端测试 HTTP 格式
- Dx-TEST-004: 中间件测试使用内联 Hono app 隔离测试各组件
