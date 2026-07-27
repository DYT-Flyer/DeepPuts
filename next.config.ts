import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'deepputs.com',
          },
        ],
        destination: 'https://www.deepputs.com/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
