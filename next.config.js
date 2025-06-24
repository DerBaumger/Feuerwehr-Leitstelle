/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
})

const nextConfig = {
  // Performance Optimierungen
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.feuerwehr-leitstelle.de"],
      bodySizeLimit: "2mb",
    },
  },

  // Sicherheit
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
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
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), notifications=(self)",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NODE_ENV === "production" ? "https://feuerwehr-leitstelle.de" : "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Requested-With",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ]
  },

  // Redirects für SEO
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "/dashboard",
        permanent: true,
      },
      {
        source: "/login",
        destination: "/",
        permanent: true,
      },
    ]
  },

  // Rewrites für API
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "/api/:path*",
      },
    ]
  },

  // Kompression und Optimierung
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  // Image Optimierung
  images: {
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    domains: [],
    unoptimized: process.env.NODE_ENV === "development",
  },

  // Build Optimierungen
  swcMinify: true,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  // Output für verschiedene Deployment-Szenarien
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,

  // Environment Variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    BUILD_TIME: new Date().toISOString(),
    VERSION: require("./package.json").version,
  },

  // Webpack Konfiguration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Bundle Analyzer
    if (process.env.ANALYZE === "true") {
      config.plugins.push(
        new webpack.DefinePlugin({
          "process.env.ANALYZE": JSON.stringify("true"),
        }),
      )
    }

    // Production Optimierungen
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            priority: 10,
            reuseExistingChunk: true,
          },
          common: {
            name: "common",
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      }
    }

    return config
  },

  // TypeScript Konfiguration
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint Konfiguration
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ["pages", "components", "lib", "app"],
  },

  // Logging
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
}

module.exports = withBundleAnalyzer(nextConfig)
