import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 💡 여기에 S3 이미지 도메인 허용 설정을 추가합니다!
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname:
          "ounce-bucket-185271206377-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com",
      },
    ],
  },

  output: "standalone",

  turbopack: {
    root: process.cwd(),
  },

  async rewrites() {
    const backend =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";

    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      // Springdoc Swagger UI and its static assets.
      // Keep these paths on the frontend domain while serving them from the backend.
      { source: "/swagger-api", destination: `${backend}/swagger-api` },
      {
        source: "/swagger-api/:path*",
        destination: `${backend}/swagger-api/:path*`,
      },
      { source: "/swagger-ui/:path*", destination: `${backend}/swagger-ui/:path*` },
      { source: "/v3/api-docs/:path*", destination: `${backend}/v3/api-docs/:path*` },
      {
        source: "/swagger-resources/:path*",
        destination: `${backend}/swagger-resources/:path*`,
      },
      { source: "/webjars/:path*", destination: `${backend}/webjars/:path*` },
      { source: "/oauth2/:path*", destination: `${backend}/oauth2/:path*` },
      {
        source: "/login/oauth2/:path*",
        destination: `${backend}/login/oauth2/:path*`,
      },
      { source: "/logout", destination: `${backend}/logout` },
    ];
  },
};

export default nextConfig;
