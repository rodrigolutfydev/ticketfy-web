import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { ArrowUpRight, Check, CircleAlert } from "lucide-react";
import { errorMessage } from "../api/client";
import { getOrder } from "../api/endpoints";
import { ErrorMessage, Loading } from "../components/StateMessage";
import { ButtonLink } from "../components/ui";
import { formatPrice, shortId } from "../utils/format";
import { isValidId } from "../utils/security";
import NotFoundPage from "./NotFoundPage";
import { usePageTitle } from "../hooks/usePageTitle";
import { useTilt } from "../hooks/motion";
import { useI18n } from "../i18n/LocaleContext";

export default function OrderConfirmationPage() {
  const { t, locale } = useI18n();
  usePageTitle(t.confirmation.pageTitle);
  const { id = "" } = useParams();
  const validId = isValidId(id);
  const { data: order, isLoading, error } = useQuery({ queryKey: ["order", id], queryFn: () => getOrder(id), enabled: validId });

  if (!validId) return <NotFoundPage />;
  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage message={errorMessage(error) ?? ""} />;
  const o = order!;
  const paid = o.status === "PAID";
  const totalTickets = o.items.reduce((sum, i) => sum + i.quantity, 0);
  const firstTicket = (o.tickets ?? []).find((ticket) => !ticket.transferred && ticket.status === "VALID");

  return (
    <div className="mx-auto grid max-w-[1100px] items-center gap-12 py-4 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className={`flex flex-col gap-5 ${paid ? "" : "items-center text-center lg:col-span-2"}`}>
        {paid ? (
          <span className="animate-badge-pop flex h-[88px] w-[88px] items-center justify-center rounded-full bg-success/[0.14] text-success shadow-[0_0_0_10px_color-mix(in_srgb,var(--success)_6%,transparent)]">
            <Check size={40} strokeWidth={2.6} aria-hidden />
          </span>
        ) : (
          <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-accent-soft text-accent-text shadow-[0_0_0_10px_color-mix(in_srgb,var(--accent)_6%,transparent)]">
            <CircleAlert size={38} aria-hidden />
          </span>
        )}

        {paid && <p className="eyebrow">{o.totalAmount === 0 ? t.confirmation.confirmed : t.confirmation.approved}</p>}
        <h1 className="max-w-[760px] text-[clamp(1.875rem,4vw,3.25rem)] font-extrabold leading-[1.05] tracking-[-0.045em] text-ink">
          {paid ? t.confirmation.paidTitle : t.confirmation.unpaidTitle}
        </h1>
        <p className="max-w-[520px] text-[1.0625rem] text-muted">{paid ? t.confirmation.paidText(totalTickets) : t.confirmation.unpaidText}</p>

        <div className="tf-panel flex w-full max-w-[520px] items-center justify-between gap-4 px-5 py-4">
          <span className="text-sm text-muted">{t.confirmation.orderNumber}</span>
          <span className="tabular font-bold text-ink">
            #{shortId(o.id)} · {formatPrice(o.totalAmount, locale)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {paid ? (
            <ButtonLink to="/tickets" size="lg">
              {t.confirmation.seeTickets} <ArrowUpRight size={17} aria-hidden />
            </ButtonLink>
          ) : (
            <ButtonLink to={`/orders/${o.id}`} size="lg">
              {t.confirmation.seeOrder}
            </ButtonLink>
          )}
          {paid && (
            <Link to={`/orders/${o.id}`} className="text-sm font-semibold text-accent-text hover:underline">
              {t.confirmation.orderDetails}
            </Link>
          )}
          <Link to="/" className="text-sm font-semibold text-muted transition-colors hover:text-ink">
            {t.confirmation.backHome}
          </Link>
        </div>
      </div>

      {paid && firstTicket?.code && <IssuedTicket code={firstTicket.code} lot={firstTicket.ticketTypeName} more={totalTickets - 1} />}
    </div>
  );
}

// O ingresso que acabou de sair: QR do primeiro ingresso do pedido, com o
// picote e o tipo de ingresso no canhoto. Inclina com o mouse.
function IssuedTicket({ code, lot, more }: { code: string; lot: string; more: number }) {
  const { t } = useI18n();
  const ref = useTilt<HTMLDivElement>(4);
  return (
    <div className="grid place-items-center">
      <div
        ref={ref}
        className="tf-cut-y relative w-full max-w-[400px] rounded-[28px] bg-[linear-gradient(170deg,color-mix(in_srgb,var(--accent)_14%,var(--surface)),var(--surface)_55%)] shadow-[inset_0_0_0_1.5px_var(--accent-line)] [--cut-y:calc(100%-96px)] [--r:16px]"
      >
        <div className="flex flex-col items-center gap-4 px-7 pb-8 pt-7 text-center">
          <p className="eyebrow">{t.confirmation.ticketTop}</p>
          <div className="rounded-[22px] bg-white p-[18px] shadow-[0_0_0_8px_color-mix(in_srgb,var(--accent)_22%,transparent),0_30px_80px_color-mix(in_srgb,var(--accent)_25%,transparent)]">
            <QRCodeSVG value={code} size={190} level="M" />
          </div>
          <p className="select-all font-mono text-sm font-bold tracking-[0.16em] text-muted">{code}</p>
        </div>
        <span className="absolute inset-x-[26px] bottom-[96px] border-t-2 border-dashed border-accent-line" aria-hidden />
        <div className="flex h-[96px] items-center justify-between gap-4 px-7">
          <div>
            <p className="text-[11px] font-bold tracking-[0.14em] text-accent-text">{t.buyer.tickets.lot}</p>
            <p className="font-semibold text-ink">{lot}</p>
          </div>
          {more > 0 && <p className="tabular font-display text-xl font-extrabold text-ink">+{more}</p>}
        </div>
      </div>
    </div>
  );
}
