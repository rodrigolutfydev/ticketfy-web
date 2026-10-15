import { ArrowUpRight } from "lucide-react";
import NeonSign from "../components/NeonSign";
import { ButtonLink } from "../components/ui";
import { usePageTitle } from "../hooks/usePageTitle";
import { useI18n } from "../i18n/LocaleContext";

export default function NotFoundPage() {
  const { t } = useI18n();
  usePageTitle(t.notFound.pageTitle);
  return (
    <NeonSign
      word={t.look.neon.notFound}
      title={
        <>
          <span className="sr-only">{t.notFound.title}: </span>
          {t.look.neon.notFoundTitle}
        </>
      }
      hint={t.look.neon.notFoundHint}
    >
      <ButtonLink to="/" size="lg">
        {t.notFound.action} <ArrowUpRight size={17} aria-hidden />
      </ButtonLink>
    </NeonSign>
  );
}
