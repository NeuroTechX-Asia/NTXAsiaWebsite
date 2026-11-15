import "../../globals.css";

import { LOCALES, htmlLang, pageMetadata } from "../../../content/locales";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return {
    ...pageMetadata(locale, {
      title: "NeuroTechX Asia - China — 亚洲神经科技共同体",
      description:
        "NeuroTechX Asia - China 是 NeuroTechX 全球网络在亚洲的区域共同体：连接大学、研究所、医院、创业者与志愿者，推动神经科技教育、开源工具与本地活动。",
    }),
    title: {
      default: "NeuroTechX Asia - China — 亚洲神经科技共同体",
      template: "%s · NeuroTechX Asia - China",
    },
    keywords: ["NeuroTechX", "NeuroTechX Asia - China", "神经科技", "脑机接口", "类脑计算", "计算神经科学", "神经工程", "NeuroAI"],
    metadataBase: new URL("https://neurotechx.asia"),
    manifest: "/site.webmanifest",
    icons: {
      icon: [
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
        { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
      shortcut: ["/favicon.ico"],
    },
    appleWebApp: { capable: true, title: "NeuroTechX Asia", statusBarStyle: "black-translucent" },
    formatDetection: { telephone: false },
  };
}

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "NeuroTechX Asia - China",
  alternateName: "NeuroTechX Asia",
  url: "https://neurotechx.asia",
  logo: "https://neurotechx.asia/icon-512.png",
  description:
    "NeuroTechX Asia - China 是 NeuroTechX 全球网络的亚洲区域共同体，连接大学、研究所、医院、创业者与志愿者。",
  parentOrganization: { "@type": "Organization", name: "NeuroTechX", url: "https://neurotechx.com" },
  areaServed: [
    { "@type": "Country", name: "China" },
    { "@type": "Country", name: "Hong Kong" },
    { "@type": "Country", name: "Singapore" },
    { "@type": "Country", name: "Japan" },
    { "@type": "Country", name: "India" },
  ],
  sameAs: ["https://www.youtube.com/@NeuroTechXAsia", "https://neurotechx.com"],
};

export const viewport = {
  themeColor: "#08090d",
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  return (
    <html lang={htmlLang(locale)} suppressHydrationWarning>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `(() => {
            try {
              var s = localStorage.getItem('ntx-theme');
              var t = s === 'light' ? 'light' : 'dark'; // dark is the brand default
              document.documentElement.dataset.theme = t;
              document.documentElement.style.colorScheme = t;
            } catch (e) {}
          })();`,
        }}
      />
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
