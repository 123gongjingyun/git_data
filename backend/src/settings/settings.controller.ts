import { Body, Controller, Get, Post } from "@nestjs/common";

interface BrandingLogoPayload {
  usageKey: string;
  displayName: string;
}

interface BrandingPayload {
  appName: string;
  logo: BrandingLogoPayload;
}

@Controller("settings")
export class SettingsController {
  // 简单的内存存储，用于当前服务进程生命周期内的示例持久化
  private branding: BrandingPayload | null = null;

  @Post("branding")
  saveBranding(@Body() body: BrandingPayload) {
    this.branding = body;
    return {
      success: true,
      message: "Branding configuration saved (in-memory demo).",
      data: this.branding,
    };
  }

  @Get("branding")
  getBranding() {
    if (!this.branding) {
      return {
        success: true,
        message: "No branding configuration set yet.",
        data: null,
      };
    }
    return {
      success: true,
      data: this.branding,
    };
  }
}

