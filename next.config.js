/** @type {import('next').NextConfig} */
const nextConfig = {
    // Performance optimizations
    compress: true,
    poweredByHeader: false,

    // Compiler optimizations with modern JS target
    compiler: {
        // Remove console logs in production
        removeConsole: process.env.NODE_ENV === 'production' ? {
            exclude: ['error', 'warn']
        } : false,

        // React optimizations
        reactRemoveProperties: process.env.NODE_ENV === 'production' ? {
            properties: ['^data-testid$']
        } : false,
    },

    turbopack: {
        rules: {
            '*.svg': {
                loaders: ['@svgr/webpack'],
                as: '*.js',
            },
        },
    },

    // Modern browser optimizations
    modularizeImports: {
        'lodash': {
            transform: 'lodash/{{member}}',
        },
    },

    // Image optimization
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.pexels.com',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
            }
        ],
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        minimumCacheTTL: 31536000, // 1 year
        dangerouslyAllowSVG: false,
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },

    // Experimental features for performance
    experimental: {
        // CSS optimization
        optimizeCss: true,
        reactCompiler: true,

        // Package imports optimization
        optimizePackageImports: [
            'lucide-react',
            '@radix-ui/react-slot',
            'class-variance-authority',
            'date-fns'
        ],

        // Bundle optimization
        optimizeServerReact: true,

        // Generate source maps for server bundles
        serverSourceMaps: true,
    },

    env: {
        CUSTOM_KEY: process.env.CUSTOM_KEY,
    },

    // TypeScript configuration
    typescript: {
        ignoreBuildErrors: false,
    },

    // ESLint configuration
    eslint: {
        ignoreDuringBuilds: false,
    },

    // Static export optimization
    trailingSlash: false,

    // Generate source maps for client bundles in production
    productionBrowserSourceMaps: true,

    // Modern headers with security optimizations
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on',
                    },
                    // Enable modern browser features
                    {
                        key: 'Accept-CH',
                        value: 'Viewport-Width, Width, DPR',
                    },
                ],
            },
            {
                // Long-term caching for static assets
                source: '/(.*).(jpg|jpeg|png|gif|ico|svg|webp|avif)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            {
                // Long-term caching for Next.js static files
                source: '/_next/static/(.*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },

    // Rewrites for better SEO
    async rewrites() {
        return [
            {
                source: '/sitemap.xml',
                destination: '/api/sitemap',
            },
        ];
    },
};

// Bundle analyzer wrapper
const withBundleAnalyzer = process.env.ANALYZE === 'true'
    ? require('@next/bundle-analyzer')({ enabled: true })
    : (config) => config;

module.exports = withBundleAnalyzer(nextConfig);
