import type { ReactNode } from "react";
import { BadgeCheck, CircleQuestionMark, ShieldCheck } from "lucide-react";
import { TabPanel, Tabs, useTabParam } from "../components/Tabs";
import { PageTitle } from "../components/ui";
import { usePageTitle } from "../hooks/usePageTitle";

// Central de ajuda com perguntas frequentes separadas por abas.
// <details>/<summary> é o "sanfona" nativo do HTML: abre e fecha sem
// JavaScript e já funciona com teclado e leitor de tela.

const TABS = ["compras", "seguranca", "organizadores"] as const;

type Faq = { q: string; a: ReactNode };

const faqs: Record<(typeof TABS)[number], Faq[]> = {
  compras: [
    { q: "Quanto tempo a reserva segura meus ingressos?", a: "Alguns minutos, mostrados no relógio da tela de pagamento. Se o tempo acabar, o pedido expira e os ingressos voltam à venda." },
    { q: "Cliquei duas vezes em comprar. Vou pagar em dobro?", a: "Não. Cada tentativa de compra leva uma chave única, e a API reconhece a repetição e devolve o mesmo pedido." },
    { q: "Onde ficam meus ingressos?", a: "Em Meus ingressos, assim que o pagamento é aprovado. Cada um tem um QR code e um código de texto." },
    { q: "Como peço reembolso?", a: "Abra o pedido pago em Pedidos e use Pedir reembolso. Os ingressos daquele pedido são cancelados na hora." },
    { q: "O preço pode mudar depois que eu comprei?", a: "Não. O valor de cada ingresso fica registrado no pedido no momento da compra." },
  ],
  seguranca: [
    { q: "Por que fui desconectado sozinho?", a: "A sessão termina ao fechar a aba, depois de 30 minutos sem uso ou quando o acesso vence. É para proteger sua conta em computadores compartilhados." },
    { q: "Posso mandar o QR code para alguém?", a: "Só para quem vai usar o ingresso. O código vale uma única entrada: quem chegar primeiro com ele entra." },
    { q: "O Ticketfy pede minha senha por e-mail ou mensagem?", a: "Nunca. Se receber um pedido assim, é golpe. A senha só é digitada na tela Entrar deste site." },
    { q: "Recebi um link que parece do Ticketfy. Como confiro?", a: "Olhe o endereço na barra do navegador antes de digitar qualquer coisa. Depois do login, o site só leva você para páginas dele mesmo." },
  ],
  organizadores: [
    { q: "Como viro organizador?", a: "Em Minha conta, aba Organizador, use Tornar-me organizador. Não precisa de aprovação." },
    { q: "Como coloco foto no evento?", a: "No formulário do evento, cole o endereço https de uma imagem já hospedada (formato paisagem fica melhor). A prévia aparece na hora." },
    { q: "Como faço o check-in na entrada?", a: "Na área do organizador, abra Check-in e digite o código do ingresso. Cada código só é aceito uma vez." },
    { q: "Posso excluir um evento com ingressos vendidos?", a: "A exclusão é lógica: o evento sai da listagem, mas pedidos e ingressos continuam no histórico." },
  ],
};

export default function HelpPage() {
  usePageTitle("Central de ajuda");
  const [tab, setTab] = useTabParam(TABS, "compras");
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Central de ajuda" subtitle="Respostas rápidas sobre compra, segurança e organização de eventos." />
      <Tabs
        label="Assuntos"
        idPrefix="ajuda"
        value={tab}
        onChange={setTab}
        items={[
          { key: "compras", label: "Compras", icon: <CircleQuestionMark size={16} /> },
          { key: "seguranca", label: "Segurança", icon: <ShieldCheck size={16} /> },
          { key: "organizadores", label: "Organizadores", icon: <BadgeCheck size={16} /> },
        ]}
      />
      <TabPanel idPrefix="ajuda" activeKey={tab}>
        <div className="divide-y divide-line overflow-hidden elevated rounded-2xl border border-line bg-surface">
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
