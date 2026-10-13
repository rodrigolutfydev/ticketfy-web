import { TicketX } from "lucide-react";
import { ButtonLink } from "../components/ui";
import { usePageTitle } from "../hooks/usePageTitle";
import { useI18n } from "../i18n/LocaleContext";

export default function NotFoundPage() {
  const { t } = useI18n();
  usePageTitle(t.notFound.pageTitle);
  return (
    <div className="py-24 text-center">
      <TicketX size={48} className="mx-auto text-accent-text" aria-hidden />
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink">{t.notFound.title}</h1>
      <p className="mt-2 text-muted">{t.notFound.hint}</p>
      <ButtonLink to="/" className="mt-8">
        {t.notFound.action}
      </ButtonLink>
    </div>
  );
}
