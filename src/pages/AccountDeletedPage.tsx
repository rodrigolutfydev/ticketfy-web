import { UserX } from "lucide-react";
import { ButtonLink } from "../components/ui";
import { usePageTitle } from "../hooks/usePageTitle";
import { useI18n } from "../i18n/LocaleContext";

export default function AccountDeletedPage() {
  const { t } = useI18n();
  const d = t.buyer.accountDeleted;
  usePageTitle(d.pageTitle);
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <UserX size={48} className="mx-auto text-accent-text" aria-hidden />
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink">{d.title}</h1>
      <p className="mt-3 text-muted">{d.text}</p>
      <p className="mt-2 text-sm text-subtle">{d.newAccount}</p>
      <ButtonLink to="/" className="mt-8">
        {d.home}
      </ButtonLink>
    </div>
  );
}
