import type { NextConfig } from "next";

const backendUrl =
  process.env.NEXT_PUBLIC_URL_BACKEND || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // cacheComponents: true,
  // reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/v1/:path*`, // Proxy /api/* -> backend/api/v1/*
      },
    ];
  },
  experimental: {
    mcpServer: true,
    optimizePackageImports: [
      "lucide-react",
      "react-icons",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-navigation-menu",
      "framer-motion",
      "@tanstack/react-query",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "chart.js",
      "react-chartjs-2",
    ],
  },
};

export default nextConfig;
