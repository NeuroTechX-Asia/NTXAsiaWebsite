import { LOCALES, SITE_URL } from "../content/locales";

export default function sitemap() {
  const lastModified = new Date();
  const pages = [
    { path: "", changeFrequency: "weekly", priority: 1 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  ];

  return pages.flatMap((page) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}/${locale}${page.path}`,
      lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: {
          zh: `${SITE_URL}/zh${page.path}`,
          en: `${SITE_URL}/en${page.path}`,
        },
      },
    })),
  );
}
