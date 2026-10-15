import { TriangleAlert } from "lucide-react";
import { PageTitle } from "../components/ui";
import { usePageTitle } from "../hooks/usePageTitle";
import { useI18n } from "../i18n/LocaleContext";
import { PRIVACY_CONTACT_EMAIL, privacyContactHref } from "../utils/contact";

export default function LegalPage({ document }: { document: "terms" | "privacy" }) {
  const { t } = useI18n();
  const content = t.legal[document];
  usePageTitle(content.pageTitle);
  return (
    <article className="mx-auto max-w-3xl">
      <PageTitle title={content.title} subtitle={content.subtitle} />
      <div role="note" className="mb-8 flex gap-3 rounded-2xl border border-accent-line bg-accent-soft p-4 text-sm text-ink">
        <TriangleAlert size={20} className="mt-0.5 shrink-0 text-warning" aria-hidden />
        <div>
          <p className="font-semibold">{t.legal.draftTitle}</p>
          <p className="mt-1 text-muted">{t.legal.draftText}</p>
        </div>
      </div>
      <p className="mb-8 text-sm text-subtle">{t.legal.updated}</p>
      <div className="space-y-8">
        {content.sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-bold tracking-[-0.035em] text-ink">{section.title}</h2>
            <div className="mt-3 space-y-3 leading-relaxed text-muted">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
        {document === "privacy" && <PrivacyContact />}
      </div>
    </article>
  );
}

function PrivacyContact() {
  const { t } = useI18n();
  const contact = t.legal.privacy.contact;
  return (
    <section id="contato">
      <h2 className="text-xl font-bold tracking-[-0.035em] text-ink">{contact.title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-muted">
        {contact.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p>
          {contact.emailLabel}{" "}
          <a href={privacyContactHref} className="font-semibold text-accent-text underline-offset-4 hover:underline">
            {PRIVACY_CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </section>
  );
}
