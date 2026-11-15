import Site from "../../../components/Site";
import { COPY } from "../../../content/copy";
import ecosystem from "../../../content/ecosystem.json";

export default async function Page({ params }) {
  const { locale } = await params;
  return <Site copy={COPY} ecosystem={ecosystem} locale={locale} />;
}
