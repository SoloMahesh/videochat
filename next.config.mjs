/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // @tensorflow/tfjs-node ships a native .node addon and nsfwjs pulls in
  // dynamic requires webpack can't statically bundle — both need to stay
  // real Node requires at runtime instead of being pulled into the
  // webpack graph.
  experimental: {
    serverComponentsExternalPackages: ["@tensorflow/tfjs-node", "nsfwjs"],
  },
};

export default nextConfig;
