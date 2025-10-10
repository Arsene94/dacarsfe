/** @type {import('next').NextConfig} */
const path = require('path');
const withMDX = require('@next/mdx')({
    extension: /\.mdx?$/,
});

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
        resolveAlias: {
            canvas: './lib/empty.js',
            '@ckeditor/ckeditor5-react': './lib/vendors/ckeditor/react.tsx',
            '@ckeditor/ckeditor5-build-classic': './lib/vendors/ckeditor/classic-editor.ts',
            'next/dist/build/polyfills/polyfill-module.js': './lib/polyfills/modern-runtime.ts',
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
            },
            {
                protocol: 'http',
                hostname: '127.0.0.1',
            },
            {
                protocol: 'https',
                hostname: 'dacars.ro',
            },
            {
                protocol: 'https',
                hostname: 'backend.dacars.ro',
                pathname: '/storage/**'
            },
            {
                protocol: 'http',
                hostname: 'backend.dacars.ro',
                pathname: '/storage/**'
            },
            {
                protocol: 'https',
                hostname: '**.dacars.ro',
            },
            {
                protocol: 'http',
                hostname: 'dacars.ro',
            },
            {
                protocol: 'http',
                hostname: '**.dacars.ro',
            }
        ],
        localPatterns: [
            {
                pathname: '/api/images/webp',
                search: 'url=*',
            },
        ],
        formats: ['image/webp'],
        deviceSizes: [360, 414, 480, 640, 750, 828, 1080, 1200, 1920],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        qualities: [55, 60, 75, 85],
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
    pageExtensions: ['ts', 'tsx', 'mdx'],

    // Generate source maps for client bundles in production
    productionBrowserSourceMaps: true,

    webpack: (config) => {
        config.resolve.alias = {
            ...(config.resolve.alias || {}),
            canvas: path.resolve(__dirname, 'lib/empty.js'),
            '@ckeditor/ckeditor5-react': path.resolve(__dirname, 'lib/vendors/ckeditor/react.tsx'),
            '@ckeditor/ckeditor5-build-classic': path.resolve(
                __dirname,
                'lib/vendors/ckeditor/classic-editor.ts'
            ),
            'next/dist/build/polyfills/polyfill-module.js': path.resolve(
                __dirname,
                'lib/polyfills/modern-runtime.ts'
            ),
        };
        return config;
    },

    // Modern headers with security optimizations
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Link',
                        value: '<https://backend.dacars.ro>; rel=preconnect; crossorigin',
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
                // Long-term caching for static images
                source: '/:all*(jpg|jpeg|png|gif|ico|svg|webp|avif)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable, stale-while-revalidate=86400',
                    },
                ],
            },
            {
                // Long-term caching for first-party scripts and styles
                source: '/:all*(js|css)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable, stale-while-revalidate=86400',
                    },
                ],
            },
            {
                // Long-term caching for fonts
                source: '/:all*(woff|woff2|ttf|eot)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable, stale-while-revalidate=86400',
                    },
                ],
            },
            {
                // Long-term caching for Next.js generated static files
                source: '/_next/static/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable, stale-while-revalidate=86400',
                    },
                ],
            },
            {
                // Cache optimized images served by Next.js
                source: '/_next/image(.*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable, stale-while-revalidate=86400',
                    },
                ],
            },
        ];
    },

    // Rewrites for better SEO
    async rewrites() {
        return [];
    },
};

// Bundle analyzer wrapper
const withBundleAnalyzer = process.env.ANALYZE === 'true'
    ? require('@next/bundle-analyzer')({ enabled: true })
    : (config) => config;

module.exports = withBundleAnalyzer(withMDX(nextConfig));
