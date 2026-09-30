import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // В Docker собираем standalone-сборку (см. Dockerfile), локально — обычную.
  output: process.env.NEXT_OUTPUT_STANDALONE === '1' ? 'standalone' : undefined,
  poweredByHeader: false,
  reactStrictMode: true,
}

export default nextConfig
