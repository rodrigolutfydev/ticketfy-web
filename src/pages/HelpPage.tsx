import { BadgeCheck, CircleQuestionMark, ShieldCheck } from "lucide-react";
import { TabPanel, Tabs, useTabParam } from "../components/Tabs";
import { PageTitle } from "../components/ui";
import { usePageTitle } from "../hooks/usePageTitle";
import { useI18n } from "../i18n/LocaleContext";

// Central de ajuda com perguntas frequentes separadas por abas.
// <details>/<summary> é o "sanfona" nativo do HTML: abre e fecha sem
// JavaScript e já funciona com teclado e leitor de tela.

const TABS = ["compras", "seguranca", "organizadores"] as const;

export default function HelpPage() {
  const { t } = useI18n();
  const h = t.buyer.help;
  usePageTitle(h.pageTitle);
  const [tab, setTab] = useTabParam(TABS, "compras");
  const faqs = { compras: h.faqs.purchases, seguranca: h.faqs.security, organizadores: h.faqs.organizers };
  return (
    <div className="max-w-3xl">
      <PageTitle title={h.title} subtitle={h.subtitle} />
      <Tabs
        label={h.tabsLabel}
        idPrefix="ajuda"
        value={tab}
        onChange={setTab}
        items={[
          { key: "compras", label: h.tabs.purchases, icon: <CircleQuestionMark size={16} /> },
          { key: "seguranca", label: h.tabs.security, icon: <ShieldCheck size={16} /> },
          { key: "organizadores", label: h.tabs.organizers, icon: <BadgeCheck size={16} /> },
        ]}
      />
      <TabPanel idPrefix="ajuda" activeKey={tab}>
        <div className="tf-panel divide-y divide-line overflow-hidden">
          {faqs[tab].map((item) => (
            <details key={item.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink hover:bg-raised [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="text-xl leading-none text-accent-text transition-transform group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <div className="px-5 pb-5 text-muted">{item.a}</div>
            </details>
          ))}
        </div>
      </TabPanel>
    </div>
  );
}
