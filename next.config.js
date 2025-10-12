import path from "node:path";
import { fileURLToPath } from "node:url";
import mdx from "@next/mdx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const withMDX = mdx({
  extension: /\.mdx?$/,
});

const nextConfig = {
  compress: true,
  poweredByHeader: false,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
    reactRemoveProperties:
      process.env.NODE_ENV === "production"
        ? {
            properties: ["^data-testid$"],
          }
        : false,
  },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
    resolveAlias: {
      canvas: "./lib/empty.js",
      "@ckeditor/ckeditor5-react": "./lib/vendors/ckeditor/react.tsx",
      "@ckeditor/ckeditor5-build-classic": "./lib/vendors/ckeditor/classic-editor.ts",
      "next/dist/build/polyfills/polyfill-module.js": "./lib/polyfills/modern-runtime.ts",
    },
  },
  modularizeImports: {
    lodash: {
      transform: "lodash/{{member}}",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      {
        protocol: "https",
        hostname: "dacars.ro",
      },
      {
        protocol: "https",
        hostname: "backend.dacars.ro",
        pathname: "/storage/**",
      },
      {
        protocol: "http",
        hostname: "backend.dacars.ro",
        pathname: "/storage/**",
      },
      {
        protocol: "https",
        hostname: "**.dacars.ro",
      },
      {
        protocol: "http",
        hostname: "dacars.ro",
      },
      {
        protocol: "http",
        hostname: "**.dacars.ro",
      },
    ],
    localPatterns: [
      {
        pathname: "/api/images/webp",
        search: "?url=*",
      },
      {
        pathname: "/api/images/webp/**",
      },
      {
        pathname: "/images/**",
      },
    ],
    formats: ["image/webp"],
    deviceSizes: [360, 414, 480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [55, 60, 75, 85],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    optimizeCss: true,
    reactCompiler: true,
    optimizePackageImports: ["lucide-react", "class-variance-authority", "date-fns"],
    optimizeServerReact: true,
    serverSourceMaps: true,
    serverActions: true,
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  trailingSlash: false,
  pageExtensions: ["ts", "tsx", "mdx"],
  productionBrowserSourceMaps: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: path.resolve(__dirname, "lib/empty.js"),
      "@ckeditor/ckeditor5-react": path.resolve(__dirname, "lib/vendors/ckeditor/react.tsx"),
      "@ckeditor/ckeditor5-build-classic": path.resolve(__dirname, "lib/vendors/ckeditor/classic-editor.ts"),
      "next/dist/build/polyfills/polyfill-module.js": path.resolve(
        __dirname,
        "lib/polyfills/modern-runtime.ts",
      ),
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Link",
            value: "<https://backend.dacars.ro>; rel=preconnect; crossorigin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Accept-CH",
            value: "Viewport-Width, Width, DPR",
          },
        ],
      },
      {
        source: "/:all*(jpg|jpeg|png|gif|ico|svg|webp|avif)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/:all*(js|css)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/:all*(woff|woff2|ttf|eot)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/_next/image(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [];
  },
};

const withBundleAnalyzer =
  process.env.ANALYZE === "true"
    ? (await import("@next/bundle-analyzer")).default({ enabled: true })
    : (config) => config;

export default withBundleAnalyzer(withMDX(nextConfig));
