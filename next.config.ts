import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // ★ 运行期写盘资产 → 动态资产路由实时读盘（2026-10-29 修复）
  // 背景：Next.js 生产/standalone 模式只服务构建时清单内的 public 静态文件，
  // TTS 等运行期写入 public/audio-cache 的新文件一律 404——这是发布域名
  // 「TTS 合成成功但音频永远加载失败」的根因。
  // 重写保持 URL 形状不变（/audio-cache/x.mp3 等被前端播放器、row-player、
  // 交付 JSON 序列化引用，改 URL 形状会破坏离线交付契约），dev / 本地
  // standalone / 发布部署三种运行形态行为完全一致。
  // 注意：本配置不含 allowedDevOrigins——项目以生产模式运行，生产模式
  // 没有 dev 专属的跨域 Origin 拦截机制，任何来源域名一律放行。
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/audio-cache/:path*", destination: "/api/asset/audio-cache/:path*" },
        { source: "/audio/:path*", destination: "/api/asset/audio/:path*" },
        { source: "/pic/:path*", destination: "/api/asset/pic/:path*" },
        { source: "/board-result/:path*", destination: "/api/asset/board-result/:path*" },
      ],
    };
  },
};

export default nextConfig;
