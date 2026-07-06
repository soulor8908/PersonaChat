// ── PersonaChat Web 冒烟测试 ──
// 每个页面组件至少 2 个断言：渲染不崩溃 + 关键文本存在
// 审计修正: R12 后 App.test.tsx 部分断言已迁移到独立页面测试文件，本文件保留 Layout 基础冒烟测试

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Home } from '../pages/Home'
import { History } from '../pages/History'
import { Create } from '../pages/Create'
import { Profile } from '../pages/Profile'

// Mock API 客户端 — 避免真实网络请求
vi.mock('../api/client', () => ({
  PersonaApi: {
    list: vi.fn().mockResolvedValue({ data: [
      { id: 'p1', name: '测试人格', description: '测试描述', category: 'thinker', likeRate: 0.8, messageCount: 10 },
    ]}),
    listHot: vi.fn().mockResolvedValue({ data: [
      { id: 'p1', name: '热门人格', description: '热门描述', category: 'thinker', likeRate: 0.9, messageCount: 20 },
    ]}),
    getById: vi.fn().mockResolvedValue({ data: { id: 'p1', name: '测试人格', systemPrompt: '你是一个测试助手' } }),
    create: vi.fn().mockResolvedValue({ data: { id: 'new-id' } }),
    preview: vi.fn().mockResolvedValue({ reply: '预览回复' }),
  },
  ChatApi: {
    getHistory: vi.fn().mockResolvedValue({ data: [] }),
    getModels: vi.fn().mockResolvedValue({ data: [
      { id: 'deepseek-v3', name: 'DeepSeek V3', free: true },
      { id: 'glm-4-flash', name: 'GLM-4 Flash', free: true },
    ]}),
    sendStream: vi.fn(),
    rateMessage: vi.fn(),
  },
  sendStream: vi.fn().mockResolvedValue({ abort: vi.fn() }),
}))

describe('Layout', () => {
  it('渲染所有导航标签', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    )
    expect(screen.getByText('人格库')).toBeInTheDocument()
    expect(screen.getByText('对话')).toBeInTheDocument()
    expect(screen.getByText('创建')).toBeInTheDocument()
    expect(screen.getByText('设置')).toBeInTheDocument()
  })

  it('导航栏使用正确的安全区 class', () => {
    const { container } = render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    )
    const nav = container.querySelector('nav')
    expect(nav).toBeInTheDocument()
    // pb-safe 已被替换为 pb-[env(safe-area-inset-bottom)]
    expect(nav!.className).toContain('pb-[')
  })

  it('当前路径对应标签高亮', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>
    )
    const homeTab = screen.getByText('人格库')
    expect(homeTab.closest('button')!.className).toContain('text-primary-500')
  })
})

describe('Home 页面', () => {

  it('渲染搜索输入框', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByPlaceholderText('搜索人格...')).toBeInTheDocument()
  })

  it('渲染分类筛选按钮', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText('全部')).toBeInTheDocument()
    expect(screen.getByText('科技领袖')).toBeInTheDocument()
    expect(screen.getByText('思想家')).toBeInTheDocument()
    expect(screen.getByText('教育者')).toBeInTheDocument()
  })

  it('渲染排序按钮', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText('热门')).toBeInTheDocument()
    expect(screen.getByText('最新')).toBeInTheDocument()
    expect(screen.getByText('最多互动')).toBeInTheDocument()
  })

  it('热门推荐区域展示头像首字母', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    // listHot 异步加载，需要等待 state 更新
    expect(await screen.findByText('热')).toBeInTheDocument()
  })
})

describe('Create 页面', () => {
  it('渲染创建表单元素', () => {
    render(
      <MemoryRouter>
        <Create />
      </MemoryRouter>
    )
    expect(screen.getByText('创建人格')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('名称 *')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('描述')).toBeInTheDocument()
  })

  it('名称为空时发布按钮禁用', () => {
    render(
      <MemoryRouter>
        <Create />
      </MemoryRouter>
    )
    const submitBtn = screen.getByText('🚀 一键发布')
    expect(submitBtn).toBeDisabled()
  })

  it('渲染工具选择按钮', () => {
    render(
      <MemoryRouter>
        <Create />
      </MemoryRouter>
    )
    expect(screen.getByText('🧮 计算器')).toBeInTheDocument()
    expect(screen.getByText('🕐 当前时间')).toBeInTheDocument()
    expect(screen.getByText('🔍 网页搜索')).toBeInTheDocument()
  })
})

describe('History 页面', () => {
  it('渲染标题', () => {
    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>
    )
    expect(screen.getByText('对话历史')).toBeInTheDocument()
  })

  it('空历史显示空状态', async () => {
    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>
    )
    // 等待 loading 状态切换
    expect(await screen.findByText('暂无对话记录')).toBeInTheDocument()
  })
})

describe('Profile 页面', () => {
  it('渲染设置标题和区域', () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    )
    expect(screen.getByText('设置')).toBeInTheDocument()
    expect(screen.getByText('API Key')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('输入 API Key (x-api-key)')).toBeInTheDocument()
    expect(screen.getByText('保存')).toBeInTheDocument()
  })

  it('渲染页脚版本信息', () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    )
    expect(screen.getByText(/PersonaChat v2.0/)).toBeInTheDocument()
  })

  it('显示可用模型列表', async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    )
    expect(await screen.findByText('DeepSeek V3')).toBeInTheDocument()
    expect(screen.getByText('GLM-4 Flash')).toBeInTheDocument()
  })
})
