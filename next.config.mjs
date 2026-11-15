/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The site is fully static-friendly: no server-only features are used.
  // `next build` + `vercel` (or `vercel --prod`) deploys as-is.
};

export default nextConfig;
