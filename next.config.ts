import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  output: "standalone",
  
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";

    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/oauth2/:path*", destination: `${backend}/oauth2/:path*` },
      { source: "/login/oauth2/:path*", destination: `${backend}/login/oauth2/:path*` },
      { source: "/logout", destination: `${backend}/logout` },
    ];
  },
};

export default nextConfig;
