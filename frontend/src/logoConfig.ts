export interface LogoConfig {
  /**
   * 插件库中对应的 usageKey，占位用于后续与后端打通。
   */
  usageKey: string;
  /**
   * 展示名称，占位用于在 UI 上显示当前 Logo 名称。
   */
  displayName: string;
}

/**
 * 当前平台左侧主 Logo 配置（Mock）。
 *
 * 后续可以改为：
 * - 从后端 /settings 接口读取；
 * - 或从本地存储 / 用户偏好中加载；
 * - 由“插件库”视图进行更新。
 */
export const defaultLogoConfig: LogoConfig = {
  usageKey: "app.logo.ai", // 对应插件库中的“AI 智能助手 Logo（示例）”
  displayName: "AI 售前助手",
};

