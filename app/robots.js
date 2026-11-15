export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/card"] }],
    sitemap: "https://neurotechx.asia/sitemap.xml",
    host: "https://neurotechx.asia",
  };
}
