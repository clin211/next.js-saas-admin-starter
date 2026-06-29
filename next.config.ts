import type { NextConfig } from "next";

/**
 * Content-Security-Policy 起步策略。
 *
 * 这是一个「能跑起来」的基线策略，不是终态：
 * - Next.js 运行时会注入内联 style（且 dev 下还有内联/eval script），
 *   所以 style-src / script-src 暂时带上 'unsafe-inline' / 'unsafe-eval'。
 * - 生产环境必须把 script-src 收紧为 nonce 制（需配合中间件生成 nonce，
 *   超出本次改动范围），并按真实后端/CDN 调整 connect-src 与 img-src。
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self'",
].join("; ");

const securityHeaders = [
  // 强制 HTTPS（2 年，含子域、可提交 preload 列表）
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // 禁止 MIME 嗅探，降低上传文件被当可执行的风险
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 跨站跳转时仅在同源下透传完整 Referer
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 按需禁用敏感设备能力（后台无需相机/麦克风/定位）
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // 内容安全策略（详见 contentSecurityPolicy 注释）
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  // 生产 Docker 镜像用 standalone 输出（自含最小 node_modules 的 server.js），
  // 见 deploy/Dockerfile。本地 `next dev` / `next start` 不受影响。
  output: "standalone",

  // 关闭 X-Powered-By，避免暴露技术栈指纹
  poweredByHeader: false,
  // 开发期提前暴露潜在副作用问题
  reactStrictMode: true,

  // 远程图片白名单：首个用 next/image 加载远程头像/图床的功能在此声明来源。
  // 当前为占位，落地真实业务前替换为具体主机。
  images: {
    remotePatterns: [
      // 例：开发环境本地服务
      { protocol: "http", hostname: "localhost" },
      // 例：泛 https 生产主机（按需收紧到具体域名）
      { protocol: "https", hostname: "**" },
    ],
  },

  async headers() {
    return [
      {
        // 应用到所有路由
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
