import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChartColumn, ExternalLink, Layers, Pencil, Plus, Receipt, Settings, X } from "lucide-react";
import { ApiError, fieldError, hasUnmappedError } from "../../api/client";
import { cancelEvent, createTicketType, deleteEvent, getEvent, getEventDashboard, listManagedTicketTypes, updateTicketType } from "../../api/endpoints";
import type { EventCancellationResult, EventDetails, TicketTypeDetails, TicketTypeUpdate } from "../../api/types";
import { ConfirmButton } from "../../components/ConfirmDialog";
import EventCover from "../../components/EventCover";
import { ErrorMessage, Loading } from "../../components/StateMessage";
import { TabPanel, Tabs, useTabParam } from "../../components/Tabs";
import { Alert, BackLink, Button, ButtonLink, Card, Field, Input, Textarea } from "../../components/ui";
import FeaturedToggle from "../../components/FeaturedToggle";
import EventOrders from "./dashboard/EventOrders";
import EventOverview from "./dashboard/EventOverview";
import { eventStamp, formatInt, formatPrice, formatShortDate, isPast, plural } from "../../utils/format";
import { isValidId } from "../../utils/security";
import NotFoundPage from "../NotFoundPage";
import OwnershipGuard from "./OwnershipGuard";
import { usePageTitle } from "../../hooks/usePageTitle";

const TABS = ["visao", "lotes", "pedidos", "configuracoes"] as const;

// Painel de um evento do organizador, dividido em abas:
// visão geral, lotes de ingresso e configurações (exclusão).
export default function OrganizerEventManagePage() {
  usePageTitle("Gerenciar evento");
  const { id = "" } = useParams();
  const validId = isValidId(id);
  const [tab, setTab] = useTabParam(TABS, "visao");
  const eventQuery = useQuery({ queryKey: ["event", id], queryFn: () => getEvent(id), enabled: validId });

  if (!validId) return <NotFoundPage />;
  if (eventQuery.isLoading) return <Loading />;
  if (eventQuery.error) return <ErrorMessage message={eventQuery.error.message} />;
  const event = eventQuery.data!;

  return (
    <div>
      <BackLink to="/organizer/events">Meus eventos</BackLink>
      <OwnershipGuard event={event}>
        <div className="mb-6 mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="hidden h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-raised sm:block">
              <EventCover name={event.name} startsAt={event.startsAt} imageUrl={event.imageUrl} />
            </div>
            <div className="min-w-0">
              <p className="tabular text-[11px] font-bold tracking-wide text-accent-text">{eventStamp(event.startsAt)}</p>
              <div className="mt-1 flex min-w-0 items-center gap-3">
                <h1 className="truncate text-3xl font-semibold tracking-tight text-ink">{event.name}</h1>
                {event.cancelledAt && (
                  <span className="shrink-0 rounded-full border border-danger/30 bg-danger/12 px-2.5 py-1 text-xs font-semibold text-danger">Cancelado</span>
                )}
              </div>
              <p className="text-sm text-muted">
                {event.venueName}, {event.city}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <FeaturedToggle eventId={id} featured={!!event.featured} />
            <ButtonLink to={`/events/${id}`} variant="ghost" size="sm">
              <ExternalLink size={15} aria-hidden /> Página pública
            </ButtonLink>
            {!event.cancelledAt && (
              <ButtonLink to={`/organizer/events/${id}/edit`} variant="secondary" size="sm">
                <Pencil size={15} aria-hidden /> Editar
              </ButtonLink>
            )}
          </div>
        </div>

        <Tabs
          label="Gerenciar evento"
          idPrefix="gerenciar"
          value={tab}
          onChange={setTab}
          items={[
            { key: "visao", label: "Visão geral", icon: <ChartColumn size={16} /> },
            { key: "lotes", label: "Lotes", icon: <Layers size={16} /> },
            { key: "pedidos", label: "Pedidos", icon: <Receipt size={16} /> },
            { key: "configuracoes", label: "Configurações", icon: <Settings size={16} /> },
          ]}
        />
        <TabPanel idPrefix="gerenciar" activeKey={tab}>
          {tab === "visao" && <EventOverview eventId={id} />}
          {tab === "lotes" && <TicketTypesTab eventId={id} />}
          {tab === "pedidos" && <EventOrders eventId={id} />}
          {tab === "configuracoes" && <SettingsTab event={event} />}
        </TabPanel>
      </OwnershipGuard>
    </div>
  );
}

function TicketTypesTab({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();
  const typesQuery = useQuery({ queryKey: ["ticket-types-manage", eventId], queryFn: () => listManagedTicketTypes(eventId) });
  const empty = { name: "", description: "", price: "", quantityTotal: "", maxPerOrder: "" };
  const [form, setForm] = useState(empty);
  const [created, setCreated] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TicketTypeDetails | null>(null);
  const [creating, setCreating] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      createTicketType(eventId, {
        name: form.name.trim(),
        description: form.description.trim(),
        // Arredonda para centavos: 19.999 vira 20.00. O backend guarda em BigDecimal.
        price: Math.round(Number(form.price) * 100) / 100,
        quantityTotal: Number(form.quantityTotal),
        maxPerOrder: form.maxPerOrder ? Number(form.maxPerOrder) : null,
      }),
    onSuccess: () => {
      setForm(empty);
      setCreated(true);
      queryClient.invalidateQueries({ queryKey: ["ticket-types", eventId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-types-manage", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-dashboard", eventId] });
    },
  });

  const set = (field: keyof typeof form) => (e: { target: { value: string } }) => {
    setCreated(false);
    setLocalError(null);
    setForm((current) => ({ ...current, [field]: e.target.value }));
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    const quantity = Number(form.quantityTotal);
    const max = form.maxPerOrder ? Number(form.maxPerOrder) : null;
    // Regras que o HTML sozinho não garante.
    if (!Number.isInteger(quantity) || (max !== null && !Number.isInteger(max))) {
      return setLocalError("Quantidades precisam ser números inteiros.");
    }
    if (max !== null && max > quantity) return setLocalError("O máximo por pedido não pode passar da quantidade total.");
    mutation.mutate();
  }

  const lots = typesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <section className="elevated overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">Lotes</h2>
          <Button size="sm" variant={creating ? "ghost" : "primary"} onClick={() => setCreating((c) => !c)}>
            {creating ? "Fechar" : <><Plus size={16} aria-hidden /> Novo lote</>}
          </Button>
        </div>
        {typesQuery.isLoading && <div className="p-5"><Loading /></div>}
        {typesQuery.error && <div className="p-5"><ErrorMessage message={typesQuery.error.message} /></div>}
        {typesQuery.data && lots.length === 0 && (
          <p className="p-5 text-sm text-muted">Nenhum lote cadastrado ainda. Sem lote, ninguém consegue comprar.</p>
        )}
        {lots.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">Lote</th>
                  <th className="px-3 py-3 text-right font-medium">Preço</th>
                  <th className="px-3 py-3 font-medium">Vendidos + reservados</th>
                  <th className="px-3 py-3 text-right font-medium">Máx. por pedido</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => (
                  <tr key={lot.id} className={`border-b border-line last:border-0 ${lot.active ? "" : "opacity-55"}`}>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-ink">{lot.name}</p>
                      {lot.description && <p className="line-clamp-1 text-xs text-muted">{lot.description}</p>}
                    </td>
                    <td className="tabular px-3 py-3.5 text-right font-semibold text-ink">{formatPrice(lot.price)}</td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-raised" aria-hidden>
                          <div className="h-full bg-accent" style={{ width: `${lot.quantityTotal ? (lot.quantitySold / lot.quantityTotal) * 100 : 0}%` }} />
                        </div>
                        <span className="tabular text-muted">
                          {formatInt(lot.quantitySold)} / {formatInt(lot.quantityTotal)}
                        </span>
                        {lot.available === 0 && <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] font-bold text-muted">ESGOTADO</span>}
                      </div>
                    </td>
                    <td className="tabular px-3 py-3.5 text-right text-muted">{lot.maxPerOrder ?? "—"}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(lot)}>
                        <Pencil size={15} aria-hidden /> Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && <LotEditor eventId={eventId} lot={editing} onClose={() => setEditing(null)} />}

      {creating && (
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-ink">Novo lote</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome">
              <Input required maxLength={100} value={form.name} onChange={set("name")} placeholder="Pista, VIP..." />
            </Field>
            <Field label="Preço (R$)">
              <Input required type="number" inputMode="decimal" min="0" max="100000" step="0.01" value={form.price} onChange={set("price")} />
            </Field>
          </div>
          <Field label="Descrição" hint="Opcional. O que esse lote inclui.">
            <Input maxLength={500} value={form.description} onChange={set("description")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantidade total">
              <Input required type="number" inputMode="numeric" min="1" max="1000000" step="1" value={form.quantityTotal} onChange={set("quantityTotal")} />
            </Field>
            <Field label="Máximo por pedido" hint="Opcional">
              <Input type="number" inputMode="numeric" min="1" max="100" step="1" value={form.maxPerOrder} onChange={set("maxPerOrder")} />
            </Field>
          </div>
          {(localError || mutation.error) && <Alert>{localError ?? mutation.error?.message}</Alert>}
          {created && <Alert type="success">Lote criado.</Alert>}
          <Button type="submit" loading={mutation.isPending}>
            Criar lote
          </Button>
        </form>
      </Card>
      )}
    </div>
  );
}

function SettingsTab({ event }: { event: EventDetails }) {
  return (
    <div className="space-y-6">
      <CancelEventSection event={event} />
      {!event.cancelledAt && <DeleteEventSection eventId={event.id} />}
    </div>
  );
}

function CancelEventSection({ event }: { event: EventDetails }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<EventCancellationResult | null>(null);
  const ended = isPast(event.endsAt ?? event.startsAt);
  const dashboardQuery = useQuery({
    queryKey: ["event-dashboard", event.id],
    queryFn: () => getEventDashboard(event.id),
    enabled: !event.cancelledAt && !ended,
  });
  const ordersWith = (status: string) => dashboardQuery.data?.ordersByStatus.find((row) => row.status === status)?.orders ?? 0;
  const paidOrders = ordersWith("PAID");
  const pendingOrders = ordersWith("PENDING");

  const mutation = useMutation({
    mutationFn: () => cancelEvent(event.id, reason),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["event", event.id] });
      queryClient.invalidateQueries({ queryKey: ["event-dashboard", event.id] });
      queryClient.invalidateQueries({ queryKey: ["event-orders", event.id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-types", event.id] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
    },
  });

  if (event.cancelledAt) {
    return (
      <div className="rounded-2xl border border-line p-6">
        <h2 className="text-lg font-extrabold text-ink">Evento cancelado</h2>
        <p className="mt-1 text-sm text-muted">Cancelado em {formatShortDate(event.cancelledAt)}.</p>
        {event.cancellationReason && <p className="mt-2 text-sm text-ink">Motivo: {event.cancellationReason}</p>}
        {result && (
          <div className="mt-4">
            <CancellationSummary result={result} />
          </div>
        )}
      </div>
    );
  }

  if (ended) return null;

  return (
    <div className="rounded-2xl border border-danger/35 p-6">
      <h2 className="text-lg font-extrabold text-ink">Cancelar evento</h2>
      <p className="mt-1 max-w-xl text-sm text-muted">
        Os pedidos pagos são reembolsados e os ingressos cancelados. Pedidos aguardando pagamento são cancelados. O evento sai da vitrine e para de vender.
      </p>
      {mutation.error && (
        <div className="mt-4">
          <Alert>{mutation.error.message}</Alert>
        </div>
      )}
      <div className="mt-5">
        <ConfirmButton
          title="Cancelar este evento?"
          description={
            <div className="space-y-4">
              {dashboardQuery.isLoading ? (
                <p>Calculando pedidos afetados...</p>
              ) : dashboardQuery.error ? (
                <p>Não foi possível contar os pedidos afetados. Todos os pedidos pagos serão reembolsados.</p>
              ) : (
                <p>
                  <strong className="text-ink">{plural(paidOrders, "pedido pago será reembolsado", "pedidos pagos serão reembolsados")}</strong>
                  {pendingOrders > 0 && ` e ${plural(pendingOrders, "pedido aguardando pagamento será cancelado", "pedidos aguardando pagamento serão cancelados")}`}.
                  {" "}Essa ação não pode ser desfeita.
                </p>
              )}
              <Field label="Motivo" hint="Opcional. Aparece na página do evento.">
                <Textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
            </div>
          }
          confirmLabel="Cancelar evento"
          danger
          loading={mutation.isPending}
          onConfirm={() => mutation.mutate()}
        >
          Cancelar evento
        </ConfirmButton>
      </div>
    </div>
  );
}

function CancellationSummary({ result }: { result: EventCancellationResult }) {
  return (
    <div className="space-y-3">
      <Alert type="success">
        {plural(result.refundedOrders, "pedido reembolsado", "pedidos reembolsados")} e {plural(result.cancelledOrders, "pedido cancelado", "pedidos cancelados")}.
      </Alert>
      {result.pendingOrders > 0 && (
        <Alert type="info">
          {plural(result.pendingOrders, "reembolso ficou", "reembolsos ficaram")} pendente{result.pendingOrders === 1 ? "" : "s"} e será{result.pendingOrders === 1 ? "" : "ão"} refeito{result.pendingOrders === 1 ? "" : "s"} automaticamente.
        </Alert>
      )}
      {result.requiresManualAction > 0 && (
        <Alert type="warning">
          {plural(result.requiresManualAction, "pedido tem", "pedidos têm")} ingresso já utilizado e precisa{result.requiresManualAction === 1 ? "" : "m"} de reembolso manual.
        </Alert>
      )}
    </div>
  );
}

function DeleteEventSection({ eventId }: { eventId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
      navigate("/organizer/events", { replace: true, state: { message: "Evento excluído." } });
    },
  });

  return (
    <div className="rounded-2xl border border-danger/35 p-6">
      <h2 className="text-lg font-extrabold text-ink">Excluir evento</h2>
      <p className="mt-1 max-w-xl text-sm text-muted">
        O evento sai da listagem pública e para de vender. Pedidos e ingressos já emitidos continuam no histórico.
      </p>
      {mutation.error && (
        <div className="mt-4">
          <Alert>{mutation.error.message}</Alert>
        </div>
      )}
      <div className="mt-5">
        <ConfirmButton
          title="Excluir este evento?"
          description="Ele deixa de aparecer na listagem e não vende mais ingressos. Essa ação não pode ser desfeita pela tela."
          confirmLabel="Excluir evento"
          danger
          loading={mutation.isPending}
          onConfirm={() => mutation.mutate()}
        >
          Excluir evento
        </ConfirmButton>
      </div>
    </div>
  );
}

// Painel lateral de edição de lote (PATCH parcial: só o que mudou vai para a API).
const LOT_FIELDS = ["name", "quantityTotal"] as const;

function LotEditor({ eventId, lot, onClose }: { eventId: string; lot: TicketTypeDetails; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: lot.name,
    description: lot.description ?? "",
    price: String(lot.price),
    quantityTotal: String(lot.quantityTotal),
    maxPerOrder: lot.maxPerOrder === null ? "" : String(lot.maxPerOrder),
  });
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const mutation = useMutation({
    mutationFn: (changes: TicketTypeUpdate) => updateTicketType(eventId, lot.id, changes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-types-manage", eventId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-types", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-dashboard", eventId] });
      ref.current?.close();
    },
  });

  const set = (field: keyof typeof form) => (e: { target: { value: string } }) => {
    setLocalError(null);
    setForm((current) => ({ ...current, [field]: e.target.value }));
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    const changes: TicketTypeUpdate = {};
    const name = form.name.trim();
    const description = form.description.trim();
    const price = Math.round(Number(form.price) * 100) / 100;
    const quantityTotal = Number(form.quantityTotal);
    if (!Number.isInteger(quantityTotal) || quantityTotal < 1) return setLocalError("A quantidade total precisa ser um número inteiro maior que zero.");
    if (form.maxPerOrder !== "" && (!Number.isInteger(Number(form.maxPerOrder)) || Number(form.maxPerOrder) < 1)) {
      return setLocalError("O máximo por pedido precisa ser um número inteiro maior que zero.");
    }
    if (lot.maxPerOrder !== null && form.maxPerOrder === "") return setLocalError("O limite por pedido não pode ser removido, só alterado.");
    if (quantityTotal < lot.quantitySold) {
      return setLocalError(`A quantidade total não pode ficar abaixo dos ${lot.quantitySold} ingressos já vendidos ou reservados.`);
    }
    if (name !== lot.name) changes.name = name;
    if (description !== (lot.description ?? "")) changes.description = description; // "" remove
    if (price !== lot.price) changes.price = price;
    if (quantityTotal !== lot.quantityTotal) changes.quantityTotal = quantityTotal;
    if (form.maxPerOrder !== "" && Number(form.maxPerOrder) !== lot.maxPerOrder) changes.maxPerOrder = Number(form.maxPerOrder);
    if (Object.keys(changes).length === 0) return ref.current?.close();
    mutation.mutate(changes);
  }

  const apiError = mutation.error instanceof ApiError ? mutation.error : null;
  const nameConflict = apiError?.problemType === "ticket-type-name-already-exists";
  const belowSold = apiError?.problemType === "invalid-ticket-type-quantity" && /quantityTotal/i.test(apiError.message);
  const nameError = nameConflict ? "Já existe um lote com esse nome neste evento." : fieldError(mutation.error, "name");
  const quantityError = belowSold ? "Abaixo do que já foi vendido ou reservado." : fieldError(mutation.error, "quantityTotal");
  const showApiAlert = !nameConflict && !belowSold && hasUnmappedError(mutation.error, LOT_FIELDS);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="editar-lote"
      className="m-0 ml-auto h-full max-h-none w-full max-w-md border-l border-line bg-surface p-0 text-ink"
    >
      {/* noValidate: as mensagens de erro são as nossas, em português, e não as do navegador. */}
      <form onSubmit={submit} noValidate className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 id="editar-lote" className="text-lg font-semibold">
            Editar lote
          </h2>
          <button type="button" onClick={() => ref.current?.close()} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <Field label="Nome" error={nameError}>
            <Input required maxLength={100} value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Descrição" hint="Deixe em branco para remover.">
            <Input maxLength={500} value={form.description} onChange={set("description")} />
          </Field>
          <Field label="Preço (R$)" hint="Pedidos já feitos continuam com o preço da compra.">
            <Input required type="number" inputMode="decimal" min="0.01" max="100000" step="0.01" value={form.price} onChange={set("price")} />
          </Field>
          <Field label="Quantidade total" hint={`${formatInt(lot.quantitySold)} já vendidos ou reservados.`} error={quantityError}>
            <Input required type="number" inputMode="numeric" min={Math.max(1, lot.quantitySold)} max="1000000" step="1" value={form.quantityTotal} onChange={set("quantityTotal")} />
          </Field>
          <Field label="Máximo por pedido" hint={lot.maxPerOrder === null ? "Opcional." : "Pode ser alterado, mas não removido."}>
            <Input type="number" inputMode="numeric" min="1" max="100" step="1" value={form.maxPerOrder} onChange={set("maxPerOrder")} />
          </Field>
          {localError && <Alert>{localError}</Alert>}
          {mutation.error && showApiAlert && <Alert>{mutation.error.message}</Alert>}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <Button variant="ghost" onClick={() => ref.current?.close()}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Salvar alterações
          </Button>
        </div>
      </form>
    </dialog>
  );
}
