import { useCallback, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Lock, QrCode, Timer } from "lucide-react";
import { errorMessage } from "../api/client";
import { cancelOrder, getOrder, payOrder } from "../api/endpoints";
import CheckoutSummary from "../components/CheckoutSummary";
import ConfirmDialog from "../components/ConfirmDialog";
import Countdown from "../components/Countdown";
import { ErrorMessage, Loading } from "../components/StateMessage";
import { Alert, BackLink, Button } from "../components/ui";
import { formatPrice, shortId } from "../utils/format";
import { isValidId } from "../utils/security";
import NotFoundPage from "./NotFoundPage";
import { usePageTitle } from "../hooks/usePageTitle";
import { useI18n } from "../i18n/LocaleContext";

// Tela de pagamento de um pedido pendente.
// A API confere que o pedido é do usuário logado (senão devolve 403/404),
// então abrir /orders/<id-de-outra-pessoa>/payment não mostra nada.
export default function PaymentPage() {
  const { t, locale } = useI18n();
  usePageTitle(t.payment.pageTitle);
  const { id = "" } = useParams();
  const validId = isValidId(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const { data: order, isLoading, error, refetch } = useQuery({ queryKey: ["order", id], queryFn: () => getOrder(id), enabled: validId });

  // Depois de pagar ou cancelar, tudo que depende do pedido fica desatualizado.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["order", id] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["tickets"] });
    queryClient.invalidateQueries({ queryKey: ["ticket-types"] });
  };

  const pay = useMutation({
    mutationFn: () => payOrder(id),
    onSuccess: () => {
      invalidate();
      navigate(`/orders/${id}/confirmation`, { replace: true });
    },
  });

  const cancel = useMutation({
    mutationFn: () => cancelOrder(id),
    onSuccess: () => {
      invalidate();
      navigate(`/orders/${id}`, { replace: true });
    },
  });

  // useCallback mantém a mesma função entre renders; sem isso, o Countdown
  // reiniciaria o intervalo a cada segundo.
  const onExpire = useCallback(() => setTimeout(() => refetch(), 3000), [refetch]);

  if (!validId) return <NotFoundPage />;
  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage message={errorMessage(error) ?? ""} />;
  const o = order!;

  // Pedido que não está mais pendente não tem o que pagar.
  if (o.status !== "PENDING") return <Navigate to={`/orders/${id}`} replace />;

  const busy = pay.isPending || cancel.isPending;

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_360px] lg:gap-12">
      <div>
        <BackLink to="/orders">{t.payment.myOrders}</BackLink>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-ink">{t.payment.title}</h1>
        <p className="mt-2 text-muted">{t.payment.order(shortId(o.id))}</p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/35 bg-warning/10 px-4 py-3">
          <span className="flex items-center gap-2.5 text-sm text-warning">
            <Timer size={18} aria-hidden /> {t.payment.reservedFor}
          </span>
          <Countdown until={o.expiresAt} onExpire={onExpire} />
        </div>

        {/* Escolha do método: dois cartões que funcionam como botões de rádio. */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t.payment.methodLabel}>
          <MethodOption selected={method === "pix"} onSelect={() => setMethod("pix")} icon={<QrCode size={22} />} title={t.payment.pix} hint={t.payment.pixHint} />
          <MethodOption selected={method === "card"} onSelect={() => setMethod("card")} icon={<CreditCard size={22} />} title={t.payment.card} hint={t.payment.cardHint} />
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          {method === "pix" ? (
            <>
              <h2 className="text-xl font-semibold text-ink">{t.payment.pixTitle}</h2>
              <ol className="mt-4 space-y-3 text-sm text-muted">
                {t.payment.pixSteps.map((step, i) => (
                  <li key={step} className="flex items-center gap-3">
                    <span className="tabular flex h-6 w-6 items-center justify-center rounded-full bg-raised text-xs font-bold text-ink">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-ink">{t.payment.cardTitle}</h2>
              <p className="mt-3 text-sm text-muted">{t.payment.cardText}</p>
            </>
          )}
          <p className="mt-5 rounded-xl border border-dashed border-line-strong p-3 text-xs text-muted">
            {t.payment.demo}
          </p>
        </div>
      </div>

      <div className="space-y-4 lg:pt-12">
        <CheckoutSummary
          total={o.totalAmount}
          discount={o.couponCode ? { code: o.couponCode, amount: o.discountAmount, subtotal: o.subtotalAmount } : null}
          lines={o.items.map((item) => ({ key: item.ticketTypeId, label: item.ticketTypeName, quantity: item.quantity, subtotal: item.subtotal }))}
        />
        {(pay.error || cancel.error) && <Alert>{errorMessage(pay.error ?? cancel.error)}</Alert>}
        {/* Desabilitado enquanto qualquer ação roda: evita pagar e cancelar ao mesmo tempo. */}
        <Button size="lg" className="w-full" loading={pay.isPending} disabled={busy} onClick={() => pay.mutate()}>
          <Lock size={16} aria-hidden /> {t.payment.pay(formatPrice(o.totalAmount, locale))}
        </Button>
        <div className="flex items-center justify-between">
          <Link to="/orders" className="text-sm font-semibold text-muted hover:text-ink">
            {t.payment.payLater}
          </Link>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmCancel(true)}>
            {t.payment.cancelOrder}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title={t.payment.cancelTitle}
        description={t.payment.cancelText}
        confirmLabel={t.payment.cancelOrder}
        cancelLabel={t.payment.keepOrder}
        danger
        loading={cancel.isPending}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => cancel.mutate()}
      />
    </div>
  );
}

function MethodOption({ selected, onSelect, icon, title, hint }: { selected: boolean; onSelect: () => void; icon: ReactNode; title: string; hint: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
        selected ? "border-accent bg-accent/5" : "border-line bg-surface hover:border-line-strong"
      }`}
    >
      <span className={selected ? "text-accent-text" : "text-muted"}>{icon}</span>
      <span className="flex-1">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${selected ? "border-accent" : "border-line-strong"}`} aria-hidden>
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
      </span>
    </button>
  );
}
