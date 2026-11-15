export const LOCALES = ["zh", "en"];
export const DEFAULT_LOCALE = "zh";
export const SITE_URL = "https://neurotechx.asia";

export function isLocale(value) {
  return LOCALES.includes(value);
}

export function htmlLang(locale) {
  return locale === "en" ? "en" : "zh-CN";
}

export function otherLocale(locale) {
  return locale === "en" ? "zh" : "en";
}

/** Swap the leading /zh or /en segment of a path. */
export function swapLocale(pathname, locale) {
  const stripped = (pathname || "/").replace(/^\/(zh|en)(?=\/|$)/, "");
  return `/${locale}${stripped === "/" ? "" : stripped}`;
}

export function pageMetadata(locale, { title, description, path = "" }) {
  const url = `${SITE_URL}/${locale}${path}`;
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: {
        "zh-CN": `/zh${path}`,
        en: `/en${path}`,
        "x-default": `/zh${path}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "NeuroTechX Asia - China",
      locale: locale === "en" ? "en_US" : "zh_CN",
      alternateLocale: [locale === "en" ? "zh_CN" : "en_US"],
      type: "website",
      images: [{ url: "/assets/og-image.png", width: 1200, height: 630, alt: "NeuroTechX Asia - China" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/assets/og-image.png"],
    },
  };
}
