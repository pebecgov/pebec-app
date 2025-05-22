// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
const nextConfig = {
  images: {
    domains: ["flippant-dove-713.convex.cloud"],
    unoptimized: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  experimental: {
    images: {
      unoptimized: true
    }
  }
};
module.exports = {
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"]
    });
    return config;
  }
};
module.exports = nextConfig;