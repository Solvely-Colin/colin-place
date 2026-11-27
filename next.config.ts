import type { NextConfig } from "next";
import path from "path";

// The Market Forge profile page is built and hosted separately (repo: catdad-market-forge, on Cloudflare).
// These rewrites serve it at colin.place/catdadmarketforge without the address changing.
const MARKET_FORGE = "https://forge.colin.place/catdadmarketforge";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      { source: "/catdadmarketforge", destination: `${MARKET_FORGE}/` },
      { source: "/catdadmarketforge/:path+", destination: `${MARKET_FORGE}/:path+` },
    ];
  },
};

export default nextConfig;
