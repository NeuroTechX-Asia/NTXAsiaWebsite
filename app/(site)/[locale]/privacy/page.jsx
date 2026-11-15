import LegalPage from "../../../../components/LegalPage";
import { pageMetadata } from "../../../../content/locales";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return pageMetadata(locale, {
    title: locale === "en" ? "Privacy Policy" : "隐私政策 Privacy Policy",
    description:
      locale === "en"
        ? "How the NeuroTechX Asia - China regional site handles personal data, following the NeuroTechX Network Privacy Policy."
        : "NeuroTechX Asia - China 区域站点如何处理个人数据，遵循 NeuroTechX 全球网络隐私政策。",
    path: "/privacy",
  });
}

export default async function PrivacyPage({ params }) {
  const { locale } = await params;
  return <LegalPage kind="privacy" locale={locale} />;
}
