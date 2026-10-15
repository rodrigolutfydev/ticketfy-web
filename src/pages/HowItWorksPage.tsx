import { BadgeCheck, CalendarPlus, CreditCard, Layers, QrCode, ScanLine, Search, Ticket, Timer } from "lucide-react";
import { TabPanel, Tabs, useTabParam } from "../components/Tabs";
import { ButtonLink, PageTitle } from "../components/ui";
import { usePageTitle } from "../hooks/usePageTitle";
import { useI18n } from "../i18n/LocaleContext";

// Explica o fluxo do sistema para quem compra e para quem organiza.
// Os passos são numerados porque são uma sequência de verdade.

const TABS = ["comprar", "organizar"] as const;

const BUY_ICONS = [<Search size={20} />, <Ticket size={20} />, <Timer size={20} />, <CreditCard size={20} />, <QrCode size={20} />];
const ORGANIZE_ICONS = [<BadgeCheck size={20} />, <CalendarPlus size={20} />, <Layers size={20} />, <ScanLine size={20} />];

export default function HowItWorksPage() {
  const { t } = useI18n();
  const h = t.buyer.howItWorks;
  usePageTitle(h.pageTitle);
  const [tab, setTab] = useTabParam(TABS, "comprar");
  const flow =
    tab === "comprar"
      ? { steps: h.buy.map((step, i) => ({ ...step, icon: BUY_ICONS[i] })), cta: { to: "/", label: h.buyCta } }
      : { steps: h.organize.map((step, i) => ({ ...step, icon: ORGANIZE_ICONS[i] })), cta: { to: "/organizer", label: h.organizeCta } };
  return (
    <div className="max-w-3xl">
      <PageTitle title={h.title} subtitle={h.subtitle} />
      <Tabs
        label={h.tabsLabel}
        idPrefix="como"
        value={tab}
        onChange={setTab}
        items={[
          { key: "comprar", label: h.tabs.buy },
          { key: "organizar", label: h.tabs.organize },
        ]}
      />
      <TabPanel idPrefix="como" activeKey={tab}>
        <ol className="relative space-y-8 border-l border-dashed border-line pl-8">
          {flow.steps.map((step, index) => (
            <li key={step.title} className="relative">
              <span className="absolute -left-[3.05rem] flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-accent-text">
                {step.icon}
              </span>
              <p className="text-sm font-bold text-subtle">{h.step(index + 1)}</p>
              <p className="mt-1 text-lg font-extrabold text-ink">{step.title}</p>
              <p className="mt-1 text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
        <ButtonLink to={flow.cta.to} className="mt-10">
          {flow.cta.label}
        </ButtonLink>
      </TabPanel>
    </div>
  );
}
