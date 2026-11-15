import LegalPage from "../../../../components/LegalPage";
import { pageMetadata } from "../../../../content/locales";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return pageMetadata(locale, {
    title: locale === "en" ? "Terms & Conditions" : "条款与条件 Terms & Conditions",
    description:
      locale === "en"
        ? "Terms of use for the NeuroTechX Asia - China regional site: directory accuracy, community conduct, intellectual property and liability."
        : "NeuroTechX Asia - China 区域站点的使用条款：目录准确性、社群行为、知识产权与责任范围。",
    path: "/terms",
  });
}

export default async function TermsPage({ params }) {
  const { locale } = await params;
  return <LegalPage kind="terms" locale={locale} />;
}
