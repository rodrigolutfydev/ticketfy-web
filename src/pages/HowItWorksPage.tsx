import { BadgeCheck, CalendarPlus, CreditCard, Layers, QrCode, ScanLine, Search, Ticket, Timer } from "lucide-react";
import { TabPanel, Tabs, useTabParam } from "../components/Tabs";
import { ButtonLink, PageTitle } from "../components/ui";
import { usePageTitle } from "../hooks/usePageTitle";

// Explica o fluxo do sistema para quem compra e para quem organiza.
// Os passos são numerados porque são uma sequência de verdade.

const TABS = ["comprar", "organizar"] as const;

const flows = {
  comprar: {
    steps: [
      { icon: <Search size={20} />, title: "Encontre o evento", text: "Busque pelo nome ou pela cidade na página inicial." },
      { icon: <Ticket size={20} />, title: "Escolha os lotes", text: "Selecione a quantidade de cada lote e revise o pedido." },
      { icon: <Timer size={20} />, title: "Reserve", text: "Os ingressos ficam guardados para você por alguns minutos." },
      { icon: <CreditCard size={20} />, title: "Pague", text: "Com o pagamento aprovado, os ingressos são emitidos na hora." },
      { icon: <QrCode size={20} />, title: "Entre", text: "Mostre o QR code na portaria. Cada código vale uma entrada." },
    ],
    cta: { to: "/", label: "Ver eventos" },
  },
  organizar: {
    steps: [
      { icon: <BadgeCheck size={20} />, title: "Ative a conta organizadora", text: "Em Minha conta, sem aprovação e sem custo." },
      { icon: <CalendarPlus size={20} />, title: "Crie o evento", text: "Nome, descrição, foto de capa, local e horário." },
      { icon: <Layers size={20} />, title: "Cadastre os lotes", text: "Defina preço, quantidade e limite por pedido." },
      { icon: <ScanLine size={20} />, title: "Faça o check-in", text: "Valide os códigos na entrada. Código usado não passa duas vezes." },
    ],
    cta: { to: "/organizer", label: "Ir para a área do organizador" },
  },
};

export default function HowItWorksPage() {
  usePageTitle("Como funciona");
  const [tab, setTab] = useTabParam(TABS, "comprar");
  const flow = flows[tab];
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Como funciona" subtitle="Do evento publicado à entrada liberada." />
      <Tabs
        label="Perfil"
        idPrefix="como"
        value={tab}
        onChange={setTab}
        items={[
          { key: "comprar", label: "Para quem compra" },
          { key: "organizar", label: "Para quem organiza" },
        ]}
      />
      <TabPanel idPrefix="como" activeKey={tab}>
        <ol className="relative space-y-8 border-l border-dashed border-line pl-8">
          {flow.steps.map((step, index) => (
            <li key={step.title} className="relative">
              <span className="absolute -left-[3.05rem] flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-accent-text">
                {step.icon}
              </span>
              <p className="text-sm font-bold text-subtle">Passo {index + 1}</p>
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
