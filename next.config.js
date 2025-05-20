/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["flippant-dove-713.convex.cloud"], // ✅ Add Convex storage domain
    unoptimized: true, // ✅ Disable image optimization for local images

  },
  typescript: {
    ignoreBuildErrors: true, // ✅ Ignores all TS errors during build
  },
  eslint: {
    ignoreDuringBuilds: true, // ✅ Ignores ESLint warnings
  },
  experimental: {
    images: {
      unoptimized: true, // ✅ Try disabling image optimization
    },
  },
};

module.exports = {
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
};


module.exports = nextConfig;
