import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, TicketPercent, Timer, X } from "lucide-react";
import { errorMessage } from "../api/client";
import { createOrder, getEvent, listTicketTypes, previewCoupon } from "../api/endpoints";
import type { CouponPreview } from "../api/types";
import CheckoutSummary from "../components/CheckoutSummary";
import { Empty, ErrorMessage, Loading } from "../components/StateMessage";
import { Alert, BackLink, Button, ButtonLink, Field, Input } from "../components/ui";
import { decodeItems } from "../utils/cart";
import { couponErrorMessage, formatDiscount, isCouponError, normalizeCouponCode } from "../utils/coupon";
import { formatPrice } from "../utils/format";
import { newIdempotencyKey } from "../utils/idempotency";
import { isValidId } from "../utils/security";
import { usePageTitle } from "../hooks/usePageTitle";

// Revisão do pedido antes de reservar. Rota privada: sem login, vai para
// o login e volta para cá com a mesma seleção (ela está na URL).
//
// Atenção: os preços mostrados aqui são só uma prévia. Quem calcula o
// valor de verdade é a API, na criação do pedido. Se alguém editar a URL
// ou o JavaScript para "baixar o preço", o pedido sai com o preço do banco.
export default function CheckoutPage() {
  usePageTitle("Revisar pedido");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const rawEventId = searchParams.get("event");
  const eventId = isValidId(rawEventId) ? rawEventId : "";
  const items = decodeItems(searchParams.get("items"));

  // useRef: a chave é criada uma vez e continua igual entre os renders.
  // Clicar de novo em "Confirmar" reenvia a MESMA chave, e a API devolve o
  // mesmo pedido em vez de criar um segundo.
  const idempotencyKey = useRef(newIdempotencyKey());
  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<CouponPreview | null>(null);

  const eventQuery = useQuery({ queryKey: ["event", eventId], queryFn: () => getEvent(eventId), enabled: !!eventId });
  const typesQuery = useQuery({ queryKey: ["ticket-types", eventId], queryFn: () => listTicketTypes(eventId), enabled: !!eventId });

  const preview = useMutation({
    mutationFn: (code: string) => previewCoupon(eventId, code, items),
    onSuccess: (result) => setApplied(result),
    onError: () => setApplied(null),
  });

  const mutation = useMutation({
    mutationFn: () => createOrder(items, idempotencyKey.current, applied?.code),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["ticket-types", eventId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      const next = order.status === "PAID" ? "confirmation" : "payment";
      navigate(`/orders/${order.id}/${next}`, { replace: true });
    },
    onError: (error) => {
      if (isCouponError(error)) {
        setApplied(null);
        idempotencyKey.current = newIdempotencyKey();
      }
    },
  });

  function applyCoupon(e: FormEvent) {
    e.preventDefault();
    const code = normalizeCouponCode(couponInput);
    if (!code) return;
    mutation.reset();
    preview.mutate(code);
  }

  function removeCoupon() {
    setApplied(null);
    setCouponInput("");
    preview.reset();
    mutation.reset();
  }

  if (!eventId || items.length === 0) {
    return (
      <Empty title="Nenhum ingresso selecionado" hint="Escolha os ingressos na página do evento.">
        <ButtonLink to="/">Ver eventos</ButtonLink>
      </Empty>
    );
  }
  if (eventQuery.isLoading || typesQuery.isLoading) return <Loading />;
  if (eventQuery.error) return <ErrorMessage message={eventQuery.error.message} />;
  if (typesQuery.error) return <ErrorMessage message={typesQuery.error.message} />;

  const event = eventQuery.data!;
  const lines = items.map((item) => ({ ...item, type: typesQuery.data!.find((t) => t.id === item.ticketTypeId) }));
  // O lote pode ter esgotado, ficado com menos que o pedido ou ter limite menor.
  const unavailable = lines.some(
    (l) =>
      !l.type ||
      l.type.soldOut ||
      (l.type.remaining !== null && l.type.remaining < l.quantity) ||
      (l.type.maxPerOrder !== null && l.quantity > l.type.maxPerOrder) ||
      (l.type.maxPerBuyer !== null && l.quantity > l.type.maxPerBuyer),
  );
  const subtotal = lines.reduce((sum, l) => sum + (l.type ? l.type.price * l.quantity : 0), 0);
  const total = applied ? applied.total : subtotal;
  const couponError = couponErrorMessage(preview.error) ?? (isCouponError(mutation.error) ? couponErrorMessage(mutation.error) : null);
  const orderError = mutation.error && !isCouponError(mutation.error) ? errorMessage(mutation.error) : null;

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_360px] lg:gap-12">
      <div>
        <BackLink to={`/events/${eventId}`}>Voltar ao evento</BackLink>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-ink">Revise seu pedido</h1>
        <p className="mt-2 text-muted">Confira os detalhes antes de seguir para o pagamento.</p>

        <p className="mt-6 flex items-start gap-2.5 rounded-xl border border-warning/35 bg-warning/10 px-4 py-3 text-sm text-warning">
          <Timer size={18} className="mt-px shrink-0" aria-hidden />
          Ao continuar, os ingressos ficam reservados para você por alguns minutos enquanto paga.
        </p>

        <ul className="mt-5 space-y-3">
          {lines.map((line) => (
            <li key={line.ticketTypeId} className="relative rounded-2xl border border-line bg-surface p-5">
              <span className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-line bg-canvas" aria-hidden />
              <span className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-line bg-canvas" aria-hidden />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">Ingresso</p>
                  <p className="mt-2 text-xl font-semibold text-ink">
                    {line.quantity > 1 && <span className="tabular">{line.quantity}× </span>}
                    {line.type?.name ?? "Lote indisponível"}
                  </p>
                  <p className="mt-1 text-sm text-muted">{event.name}</p>
                </div>
                <p className="tabular text-lg font-bold text-accent-text">{line.type ? formatPrice(line.type.price * line.quantity) : "—"}</p>
              </div>
            </li>
          ))}
        </ul>
        <Link to={`/events/${eventId}`} className="mt-4 inline-block text-sm font-semibold text-muted hover:text-ink">
          Alterar seleção
        </Link>
      </div>

      <div className="space-y-4 lg:pt-12">
        <CheckoutSummary
          event={event}
          total={total}
          discount={applied ? { code: applied.code, amount: applied.discount, subtotal: applied.subtotal } : null}
          lines={lines.map((l) => ({
            key: l.ticketTypeId,
            label: l.type?.name ?? "Lote indisponível",
            quantity: l.quantity,
            subtotal: l.type ? l.type.price * l.quantity : null,
          }))}
        />
        <div className="rounded-2xl border border-line bg-surface p-5">
          {applied ? (
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm text-ink">
                <TicketPercent size={18} className="text-success" aria-hidden />
                <span>
                  Cupom <span className="font-semibold">{applied.code}</span> aplicado ({formatDiscount(applied.discountType, applied.discountValue)})
                </span>
              </p>
              <Button size="sm" variant="ghost" onClick={removeCoupon} disabled={mutation.isPending}>
                <X size={15} aria-hidden /> Remover
              </Button>
            </div>
          ) : (
            <form onSubmit={applyCoupon} noValidate className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Field label="Cupom" error={couponError ?? undefined}>
                  <Input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    maxLength={30}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder="Código do cupom"
                  />
                </Field>
              </div>
              <Button type="submit" variant="secondary" loading={preview.isPending} disabled={!couponInput.trim() || unavailable}>
                Aplicar
              </Button>
            </form>
          )}
          {applied && couponError && <p className="mt-2 text-sm text-danger">{couponError}</p>}
        </div>
        {unavailable && <Alert>Algum lote esgotou ou não aceita essa quantidade. Volte e ajuste a seleção.</Alert>}
        {orderError && <Alert>{orderError}</Alert>}
        <Button size="lg" className="w-full" disabled={unavailable || preview.isPending} loading={mutation.isPending} onClick={() => mutation.mutate()}>
          {total === 0 ? "Confirmar pedido" : "Reservar e ir para pagamento"} <ArrowRight size={17} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
