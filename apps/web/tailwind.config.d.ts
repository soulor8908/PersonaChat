// TECH-WEB-D-1 — TS 类型声明（Spec 偏离 D-1：为 import tailwindConfig 提供类型支持）
// 使用简化类型便于测试访问 colors/corePlugins 属性
interface SimpleTailwindConfig {
  darkMode?: string | boolean
  theme?: {
    extend?: {
      colors?: Record<string, Record<string, string> | string>
    }
  }
  corePlugins?: Record<string, boolean>
}
const config: SimpleTailwindConfig
export default config
