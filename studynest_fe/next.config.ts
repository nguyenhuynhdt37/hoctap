import type { NextConfig } from "next";

const backendUrl =
  process.env.NEXT_PUBLIC_URL_BACKEND || "http://127.0.0.1:8000";
const isDev = process.env.NODE_ENV === "development";

function parseCspUrl(value: string | undefined, protocols: readonly string[]) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (
      protocols.includes(url.protocol) &&
      /^[a-z0-9.:[\]-]+$/i.test(url.hostname) &&
      !url.username &&
      !url.password
    ) {
      return url;
    }
  } catch {
    // Only valid configured URLs can contribute CSP sources.
  }
}

const backend = parseCspUrl(backendUrl, ["https:", "http:"]);
const socket = parseCspUrl(
  process.env.NEXT_PUBLIC_URL_BACKEND_WS || "ws://127.0.0.1:8000",
  ["wss:", "ws:"],
);
const derivedSocket = backend?.origin.replace(/^http/, "ws");
const devSocket = isDev
  ? parseCspUrl(process.env.NEXT_PUBLIC_URL_FRONTEND || "http://localhost:3000", ["https:", "http:"])
      ?.origin.replace(/^http/, "ws")
  : undefined;
const assetOrigins = (process.env.CSP_ASSET_ORIGINS ?? "")
  .split(",")
  .flatMap((value) => parseCspUrl(value.trim(), ["https:"])?.origin ?? []);
const avatarOrigins = ["https://lh3.googleusercontent.com", "https://avatars.githubusercontent.com"];
const optimizedImageOrigins = [...new Set([...avatarOrigins, ...assetOrigins])];
const reportUrl = parseCspUrl(process.env.CSP_REPORT_URL, ["https:"]);
const reportEndpoint =
  reportUrl && !reportUrl.search && !reportUrl.hash && !/[;,]/.test(reportUrl.href)
    ? reportUrl.href
    : undefined;
const googleSignIn = "https://accounts.google.com/gsi/";
const youtube = "https://www.youtube.com";

const cspDirectives: Record<string, (string | undefined)[]> = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'", "'unsafe-inline'", isDev ? "'unsafe-eval'" : undefined,
    `${googleSignIn}client`, `${youtube}/iframe_api`, `${youtube}/s/player/`,
  ],
  "style-src": ["'self'", "'unsafe-inline'", `${googleSignIn}style`],
  "img-src": [
    "'self'", "blob:", "data:", backend?.origin, ...assetOrigins,
    ...avatarOrigins, "https://ui-avatars.com", "https://placehold.co",
  ],
  "font-src": ["'self'"],
  "connect-src": [
    "'self'", backend?.origin, socket?.origin, derivedSocket, devSocket,
    googleSignIn, "https://provinces.open-api.vn",
  ],
  "media-src": ["'self'", "blob:", backend?.origin, ...assetOrigins],
  "frame-src": [googleSignIn, `${youtube}/embed/`],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "frame-ancestors": ["'none'"],
  "form-action": ["'self'"],
};

if (reportEndpoint) {
  cspDirectives["report-uri"] = [reportEndpoint];
  cspDirectives["report-to"] = ["maymay-csp"];
}

const csp = Object.entries(cspDirectives)
  .map(([directive, values]) => [directive, ...new Set(values.filter(Boolean))].join(" "))
  .join("; ");

const nextConfig: NextConfig = {
  // Cho phép mở dev server từ thiết bị khác (điện thoại) qua IP LAN/Tailscale.
  allowedDevOrigins: ["192.168.100.36", "100.94.151.7", "macbook-pro-7.tail6d3a82.ts.net"],
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // cacheComponents: true,
  // reactCompiler: true,
  env: {
    NEXT_PUBLIC_OPTIMIZED_STUDY_IMAGE_ORIGINS: optimizedImageOrigins.join(","),
  },
  images: {
    remotePatterns: optimizedImageOrigins.map((origin) => {
      const { hostname, port } = new URL(origin);
      return { protocol: "https", hostname, port, pathname: "/**" };
    }),
  },
  async headers() {
    const headers = [
      { key: "Content-Security-Policy-Report-Only", value: csp },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      {
        key: "Permissions-Policy",
        value: "camera=(), geolocation=(), microphone=(self), payment=()",
      },
    ];
    if (reportEndpoint) {
      headers.push({ key: "Reporting-Endpoints", value: `maymay-csp="${reportEndpoint}"` });
    }
    if (process.env.NODE_ENV === "production") {
      headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000" });
    }
    return [
      { source: "/:path*", headers },
      {
        source: "/auth/github/callback",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
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
      "pulsoicon-react",
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
