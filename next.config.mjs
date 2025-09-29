/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Amplify最適化設定
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: process.cwd(),
  },
  // ビルド時間短縮
  swcMinify: true,
  // 不要な最適化を無効化してビルド時間短縮
  optimizeFonts: false,
};

export default nextConfig;
