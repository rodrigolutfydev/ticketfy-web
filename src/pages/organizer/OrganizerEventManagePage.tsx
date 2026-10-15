import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChartColumn, ExternalLink, Layers, Pencil, Plus, Receipt, Settings, TicketPercent, Users, X } from "lucide-react";
import { ApiError, errorMessage, fieldError, hasUnmappedError } from "../../api/client";
import {
  cancelEvent, createTicketType, getCancellationPreview, deactivateTicketType, deleteEvent, getEvent, listManagedTicketTypes, reactivateTicketType,
  updateTicketType,
} from "../../api/endpoints";
import type { EventCancellationResult, EventDetails, TicketTypeDetails, TicketTypeUpdate } from "../../api/types";
import ConfirmDialog, { ConfirmButton } from "../../components/ConfirmDialog";
import EventCover from "../../components/EventCover";
import { ErrorMessage, Loading } from "../../components/StateMessage";
import { TabPanel, Tabs, useTabParam } from "../../components/Tabs";
import { Alert, BackLink, Button, ButtonLink, Card, Field, Form, Input, Textarea } from "../../components/ui";
import FeaturedToggle from "../../components/FeaturedToggle";
import CouponsTab from "./CouponsTab";
import EventOrders from "./dashboard/EventOrders";
import EventParticipants from "./dashboard/EventParticipants";
import EventOverview from "./dashboard/EventOverview";
import { eventStamp, formatInt, formatPrice, formatShortDate, isPast } from "../../utils/format";
import { useI18n } from "../../i18n/LocaleContext";
import { maxPerBuyerChange, suggestedMaxPerBuyer } from "../../utils/lots";
import { previewLines, resultLines } from "../../utils/cancellation";
import { lotToggleCopy } from "../../utils/participants";
import { isValidId } from "../../utils/security";
import NotFoundPage from "../NotFoundPage";
import OwnershipGuard from "./OwnershipGuard";
import { usePageTitle } from "../../hooks/usePageTitle";

const TABS = ["visao", "lotes", "cupons", "pedidos", "participantes", "configuracoes"] as const;

// Painel de um evento do organizador, dividido em abas:
// visão geral, lotes de ingresso e configurações (exclusão).
export default function OrganizerEventManagePage() {
  const { t, locale } = useI18n();
  const m = t.organizer.manage;
  usePageTitle(m.pageTitle);
  const { id = "" } = useParams();
  const validId = isValidId(id);
  const [tab, setTab] = useTabParam(TABS, "visao");
  const eventQuery = useQuery({ queryKey: ["event", id], queryFn: () => getEvent(id), enabled: validId });

  if (!validId) return <NotFoundPage />;
  if (eventQuery.isLoading) return <Loading />;
  if (eventQuery.error) return <ErrorMessage message={errorMessage(eventQuery.error) ?? ""} />;
  const event = eventQuery.data!;

  return (
    <div>
      <BackLink to="/organizer/events">{m.myEvents}</BackLink>
      <OwnershipGuard event={event}>
        <div className="mb-6 mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="hidden h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-raised sm:block">
              <EventCover name={event.name} startsAt={event.startsAt} imageUrl={event.imageUrl} />
            </div>
            <div className="min-w-0">
              <p className="tabular text-[11px] font-bold tracking-wide text-accent-text">{eventStamp(event.startsAt, locale)}</p>
              <div className="mt-1 flex min-w-0 items-center gap-3">
                <h1 className="truncate text-3xl font-bold tracking-[-0.035em] text-ink">{event.name}</h1>
                {event.cancelledAt && (
                  <span className="shrink-0 rounded-full border border-danger/30 bg-danger/12 px-2.5 py-1 text-xs font-semibold text-danger">{m.cancelled}</span>
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
              <ExternalLink size={15} aria-hidden /> {m.publicPage}
            </ButtonLink>
            {!event.cancelledAt && (
              <ButtonLink to={`/organizer/events/${id}/edit`} variant="secondary" size="sm">
                <Pencil size={15} aria-hidden /> {m.edit}
              </ButtonLink>
            )}
          </div>
        </div>

        <Tabs
          label={m.tabsLabel}
          idPrefix="gerenciar"
          value={tab}
          onChange={setTab}
          items={[
            { key: "visao", label: m.tabs.overview, icon: <ChartColumn size={16} /> },
            { key: "lotes", label: m.tabs.lots, icon: <Layers size={16} /> },
            { key: "cupons", label: m.tabs.coupons, icon: <TicketPercent size={16} /> },
            { key: "pedidos", label: m.tabs.orders, icon: <Receipt size={16} /> },
            { key: "participantes", label: m.tabs.participants, icon: <Users size={16} /> },
            { key: "configuracoes", label: m.tabs.settings, icon: <Settings size={16} /> },
          ]}
        />
        <TabPanel idPrefix="gerenciar" activeKey={tab}>
          {tab === "visao" && <EventOverview eventId={id} />}
          {tab === "lotes" && <TicketTypesTab eventId={id} />}
          {tab === "cupons" && <CouponsTab eventId={id} cancelled={!!event.cancelledAt} />}
          {tab === "pedidos" && <EventOrders eventId={id} />}
          {tab === "participantes" && <EventParticipants eventId={id} />}
          {tab === "configuracoes" && <SettingsTab event={event} />}
        </TabPanel>
      </OwnershipGuard>
    </div>
  );
}

function TicketTypesTab({ eventId }: { eventId: string }) {
  const { t, locale } = useI18n();
  const l = t.organizer.lots;
  const queryClient = useQueryClient();
  const typesQuery = useQuery({ queryKey: ["ticket-types-manage", eventId], queryFn: () => listManagedTicketTypes(eventId) });
  const empty = { name: "", description: "", price: "", quantityTotal: "", maxPerOrder: "", maxPerBuyer: "" };
  const [form, setForm] = useState(empty);
  const [buyerLimitTouched, setBuyerLimitTouched] = useState(false);
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
        maxPerBuyer: form.maxPerBuyer ? Number(form.maxPerBuyer) : null,
      }),
    onSuccess: () => {
      setForm(empty);
      setBuyerLimitTouched(false);
      setCreated(true);
      queryClient.invalidateQueries({ queryKey: ["ticket-types", eventId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-types-manage", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-dashboard", eventId] });
    },
  });

  const set = (field: keyof typeof form) => (e: { target: { value: string } }) => {
    setCreated(false);
    setLocalError(null);
    if (field === "maxPerBuyer") setBuyerLimitTouched(true);
    const value = e.target.value;
    setForm((current) => {
      const next = { ...current, [field]: value };
      return field === "price"
        ? { ...next, maxPerBuyer: suggestedMaxPerBuyer(value, current.maxPerBuyer, buyerLimitTouched) }
        : next;
    });
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    const quantity = Number(form.quantityTotal);
    const max = form.maxPerOrder ? Number(form.maxPerOrder) : null;
    const perBuyer = form.maxPerBuyer ? Number(form.maxPerBuyer) : null;
    if (perBuyer !== null && (!Number.isInteger(perBuyer) || perBuyer < 1)) {
      return setLocalError(l.errors.perBuyer);
    }
    // Regras que o HTML sozinho não garante.
    if (!Number.isInteger(quantity) || (max !== null && !Number.isInteger(max))) {
      return setLocalError(l.errors.integers);
    }
    if (max !== null && max > quantity) return setLocalError(l.errors.maxOverTotal);
    mutation.mutate();
  }

  const lots = typesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <section className="tf-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">{l.title}</h2>
          <Button size="sm" variant={creating ? "ghost" : "primary"} onClick={() => setCreating((c) => !c)}>
            {creating ? l.close : <><Plus size={16} aria-hidden /> {l.newLot}</>}
          </Button>
        </div>
        {typesQuery.isLoading && <div className="p-5"><Loading /></div>}
        {typesQuery.error && <div className="p-5"><ErrorMessage message={errorMessage(typesQuery.error) ?? ""} /></div>}
        {typesQuery.data && lots.length === 0 && (
          <p className="p-5 text-sm text-muted">{l.empty}</p>
        )}
        {lots.length > 0 && (
          <ul className="divide-y divide-line md:hidden">
            {lots.map((lot) => (
              <li key={lot.id} className="space-y-3 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{lot.name}</p>
                    {lot.description && <p className="line-clamp-2 text-xs text-muted">{lot.description}</p>}
                  </div>
                  <p className="tabular shrink-0 font-semibold text-ink">{formatPrice(lot.price, locale)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${lot.active ? "bg-success/12 text-success" : "bg-raised text-muted"}`}>
                    {lot.active ? l.onSale : l.inactive}
                  </span>
                  {lot.available === 0 && <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] font-bold text-muted">{l.soldOut}</span>}
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{l.soldReserved}</span>
                    <span className="tabular">
                      {formatInt(lot.quantitySold, locale)} / {formatInt(lot.quantityTotal, locale)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden>
                    <div className="h-full bg-accent" style={{ width: `${lot.quantityTotal ? (lot.quantitySold / lot.quantityTotal) * 100 : 0}%` }} />
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted">{l.maxPerOrder}</dt>
                    <dd className="tabular font-semibold text-ink">{lot.maxPerOrder ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">{l.maxPerBuyer}</dt>
                    <dd className="tabular font-semibold text-ink">{lot.maxPerBuyer ?? "—"}</dd>
                  </div>
                </dl>
                <div className="grid grid-cols-2 gap-2 [&>button]:w-full [&>div]:items-stretch [&>div>button]:w-full">
                  <Button variant="secondary" onClick={() => setEditing(lot)}>
                    <Pencil size={15} aria-hidden /> {l.edit}
                  </Button>
                  <LotToggle eventId={eventId} lot={lot} lots={lots} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {lots.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">{l.lot}</th>
                  <th className="px-3 py-3 text-right font-medium">{l.price}</th>
                  <th className="px-3 py-3 font-medium">{l.soldReserved}</th>
                  <th className="px-3 py-3 text-right font-medium">{l.maxPerOrder}</th>
                  <th className="px-3 py-3 text-right font-medium">{l.maxPerBuyer}</th>
                  <th className="px-3 py-3 font-medium">{l.status}</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">{l.actions}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => (
                  <tr key={lot.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-ink">{lot.name}</p>
                      {lot.description && <p className="line-clamp-1 text-xs text-muted">{lot.description}</p>}
                    </td>
                    <td className="tabular px-3 py-3.5 text-right font-semibold text-ink">{formatPrice(lot.price, locale)}</td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-raised" aria-hidden>
                          <div className="h-full bg-accent" style={{ width: `${lot.quantityTotal ? (lot.quantitySold / lot.quantityTotal) * 100 : 0}%` }} />
                        </div>
                        <span className="tabular text-muted">
                          {formatInt(lot.quantitySold, locale)} / {formatInt(lot.quantityTotal, locale)}
                        </span>
                        {lot.available === 0 && <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] font-bold text-muted">{l.soldOut}</span>}
                      </div>
                    </td>
                    <td className="tabular px-3 py-3.5 text-right text-muted">{lot.maxPerOrder ?? "—"}</td>
                    <td className="tabular px-3 py-3.5 text-right text-muted">{lot.maxPerBuyer ?? "—"}</td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                          lot.active ? "bg-success/12 text-success" : "bg-raised text-muted"
                        }`}
                      >
                        {lot.active ? l.onSale : l.inactive}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-start justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(lot)}>
                          <Pencil size={15} aria-hidden /> {l.edit}
                        </Button>
                        <LotToggle eventId={eventId} lot={lot} lots={lots} />
                      </div>
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
        <h2 className="mb-4 text-lg font-semibold text-ink">{l.newLot}</h2>
        <Form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={l.name}>
              <Input required maxLength={100} value={form.name} onChange={set("name")} placeholder={l.namePlaceholder} />
            </Field>
            <Field label={l.priceLabel} hint={l.priceHint}>
              <Input required type="number" inputMode="decimal" min="0" max="100000" step="0.01" value={form.price} onChange={set("price")} />
            </Field>
          </div>
          <Field label={l.description} hint={l.descriptionHint}>
            <Input maxLength={500} value={form.description} onChange={set("description")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={l.quantityTotal}>
              <Input required type="number" inputMode="numeric" min="1" max="1000000" step="1" value={form.quantityTotal} onChange={set("quantityTotal")} />
            </Field>
            <Field label={l.maxPerOrderLabel} hint={l.optional}>
              <Input type="number" inputMode="numeric" min="1" max="100" step="1" value={form.maxPerOrder} onChange={set("maxPerOrder")} />
            </Field>
          </div>
          <Field label={l.maxPerBuyerLabel} hint={l.maxPerBuyerHint}>
            <Input type="number" inputMode="numeric" min="1" max="1000" step="1" value={form.maxPerBuyer} onChange={set("maxPerBuyer")} />
          </Field>
          {(localError || mutation.error) && <Alert>{localError ?? errorMessage(mutation.error)}</Alert>}
          {created && <Alert type="success">{l.created}</Alert>}
          <Button type="submit" loading={mutation.isPending}>
            {l.create}
          </Button>
        </Form>
      </Card>
      )}
    </div>
  );
}

function LotToggle({ eventId, lot, lots }: { eventId: string; lot: TicketTypeDetails; lots: TicketTypeDetails[] }) {
  const queryClient = useQueryClient();
  const { locale } = useI18n();
  const copy = lotToggleCopy(lot, lots, locale);
  const mutation = useMutation({
    mutationFn: () => (lot.active ? deactivateTicketType(eventId, lot.id) : reactivateTicketType(eventId, lot.id)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-types-manage", eventId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-types", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-dashboard", eventId] });
    },
  });

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmButton
        variant={lot.active ? "danger" : "secondary"}
        title={copy.title}
        description={copy.description}
        confirmLabel={copy.confirmLabel}
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate()}
      >
        {copy.confirmLabel}
      </ConfirmButton>
      {mutation.error && <p className="max-w-[16rem] text-right text-xs text-danger">{errorMessage(mutation.error)}</p>}
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
  const { t, locale } = useI18n();
  const s = t.organizer.settings;
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<EventCancellationResult | null>(null);
  const ended = isPast(event.endsAt ?? event.startsAt);
  // A prévia é pedida ao abrir a confirmação (staleTime 0): os números são do momento da consulta.
  const previewQuery = useQuery({
    queryKey: ["cancellation-preview", event.id],
    queryFn: () => getCancellationPreview(event.id),
    enabled: confirming && !event.cancelledAt && !ended,
    staleTime: 0,
  });

  const mutation = useMutation({
    mutationFn: () => cancelEvent(event.id, reason),
    onSuccess: (data) => {
      setResult(data);
      setConfirming(false);
      queryClient.invalidateQueries({ queryKey: ["event", event.id] });
      queryClient.invalidateQueries({ queryKey: ["event-dashboard", event.id] });
      queryClient.invalidateQueries({ queryKey: ["event-orders", event.id] });
      queryClient.invalidateQueries({ queryKey: ["cancellation-preview", event.id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-types", event.id] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
    },
  });

  if (event.cancelledAt) {
    return (
      <div className="rounded-[18px] border border-line p-6">
        <h2 className="text-lg font-extrabold text-ink">{s.cancelledTitle}</h2>
        <p className="mt-1 text-sm text-muted">{s.cancelledAt(formatShortDate(event.cancelledAt, locale))}</p>
        {event.cancellationReason && <p className="mt-2 text-sm text-ink">{s.reason(event.cancellationReason)}</p>}
        {result && (
          <div className="mt-4">
            <CancellationSummary result={result} />
          </div>
        )}
      </div>
    );
  }

  if (ended) return null;

  const lines = previewQuery.data ? previewLines(previewQuery.data) : [];

  return (
    <div className="rounded-2xl border border-danger/35 p-6">
      <h2 className="text-lg font-extrabold text-ink">{s.cancelTitle}</h2>
      <p className="mt-1 max-w-xl text-sm text-muted">{s.cancelText}</p>
      {mutation.error && (
        <div className="mt-4">
          <Alert>{errorMessage(mutation.error)}</Alert>
        </div>
      )}
      <div className="mt-5">
        <Button variant="danger" onClick={() => setConfirming(true)} loading={mutation.isPending}>
          {s.cancelEvent}
        </Button>
        <ConfirmDialog
          open={confirming}
          title={s.cancelConfirmTitle}
          description={
            <div className="space-y-4">
              {previewQuery.isFetching && !previewQuery.data ? (
                <p>{s.counting}</p>
              ) : previewQuery.error ? (
                <p>{s.countFailed}</p>
              ) : previewQuery.data ? (
                <div>
                  <p className="font-semibold text-ink">{lines.length > 0 ? s.previewTitle : s.previewNone}</p>
                  {lines.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5" data-testid="cancellation-preview">
                      {lines.map((line) => (
                        <li key={line.key} className={line.key === "manual" ? "font-semibold text-danger" : "text-ink"}>
                          {s.preview[line.key](line.count)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
              <p>{s.irreversible}</p>
              <Field label={s.reasonLabel} hint={s.reasonHint}>
                <Textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
            </div>
          }
          confirmLabel={s.cancelEvent}
          danger
          loading={mutation.isPending}
          onClose={() => setConfirming(false)}
          onConfirm={() => mutation.mutate()}
        />
      </div>
    </div>
  );
}

function CancellationSummary({ result }: { result: EventCancellationResult }) {
  const { t } = useI18n();
  const s = t.organizer.settings;
  const lines = resultLines(result);
  return (
    <div className="space-y-3">
      <Alert type="success">
        <p className="font-semibold">{s.resultTitle}</p>
        {lines.length > 0 ? (
          <ul className="mt-1 list-disc pl-5" data-testid="cancellation-result">
            {lines.map((line) => (
              <li key={line.key}>{s.result[line.key](line.count)}</li>
            ))}
          </ul>
        ) : (
          <p>{s.resultNone}</p>
        )}
      </Alert>
      {result.pendingOrders > 0 && <Alert type="info">{s.pendingRefunds(result.pendingOrders)}</Alert>}
      {result.requiresManualAction > 0 && <Alert type="warning">{s.manualRefunds(result.requiresManualAction)}</Alert>}
    </div>
  );
}

function DeleteEventSection({ eventId }: { eventId: string }) {
  const { t } = useI18n();
  const s = t.organizer.settings;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
      navigate("/organizer/events", { replace: true, state: { message: t.organizer.events.deleted } });
    },
  });

  return (
    <div className="rounded-2xl border border-danger/35 p-6">
      <h2 className="text-lg font-extrabold text-ink">{s.deleteTitle}</h2>
      <p className="mt-1 max-w-xl text-sm text-muted">{s.deleteText}</p>
      {mutation.error && (
        <div className="mt-4">
          <Alert>{errorMessage(mutation.error)}</Alert>
        </div>
      )}
      <div className="mt-5">
        <ConfirmButton
          title={s.deleteConfirmTitle}
          description={s.deleteConfirmText}
          confirmLabel={s.deleteEvent}
          danger
          loading={mutation.isPending}
          onConfirm={() => mutation.mutate()}
        >
          {s.deleteEvent}
        </ConfirmButton>
      </div>
    </div>
  );
}

// Painel lateral de edição de lote (PATCH parcial: só o que mudou vai para a API).
const LOT_FIELDS = ["name", "quantityTotal", "maxPerBuyer"] as const;

function LotEditor({ eventId, lot, onClose }: { eventId: string; lot: TicketTypeDetails; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const l = t.organizer.lots;
  const ed = l.editor;
  const [form, setForm] = useState({
    name: lot.name,
    description: lot.description ?? "",
    price: String(lot.price),
    quantityTotal: String(lot.quantityTotal),
    maxPerOrder: lot.maxPerOrder === null ? "" : String(lot.maxPerOrder),
    maxPerBuyer: lot.maxPerBuyer === null ? "" : String(lot.maxPerBuyer),
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
    if (form.price.trim() === "" || !Number.isFinite(price) || price < 0) return setLocalError(l.errors.price);
    if (!Number.isInteger(quantityTotal) || quantityTotal < 1) return setLocalError(l.errors.quantity);
    if (form.maxPerOrder !== "" && (!Number.isInteger(Number(form.maxPerOrder)) || Number(form.maxPerOrder) < 1)) {
      return setLocalError(l.errors.maxPerOrder);
    }
    if (lot.maxPerOrder !== null && form.maxPerOrder === "") return setLocalError(l.errors.maxPerOrderRemoval);
    if (form.maxPerBuyer !== "" && (!Number.isInteger(Number(form.maxPerBuyer)) || Number(form.maxPerBuyer) < 1)) {
      return setLocalError(l.errors.perBuyer);
    }
    if (quantityTotal < lot.quantitySold) {
      return setLocalError(l.errors.belowSold(lot.quantitySold));
    }
    if (name !== lot.name) changes.name = name;
    if (description !== (lot.description ?? "")) changes.description = description; // "" remove
    if (price !== lot.price) changes.price = price;
    if (quantityTotal !== lot.quantityTotal) changes.quantityTotal = quantityTotal;
    if (form.maxPerOrder !== "" && Number(form.maxPerOrder) !== lot.maxPerOrder) changes.maxPerOrder = Number(form.maxPerOrder);
    const perBuyer = maxPerBuyerChange(lot.maxPerBuyer, form.maxPerBuyer);
    if (perBuyer !== undefined) changes.maxPerBuyer = perBuyer;
    if (Object.keys(changes).length === 0) return ref.current?.close();
    mutation.mutate(changes);
  }

  const apiError = mutation.error instanceof ApiError ? mutation.error : null;
  const nameConflict = apiError?.problemType === "ticket-type-name-already-exists";
  const belowSold = apiError?.problemType === "invalid-ticket-type-quantity" && apiError.properties.reason === "below-sold";
  const nameError = nameConflict ? errorMessage(apiError, "lot") ?? undefined : fieldError(mutation.error, "name");
  const quantityError = belowSold ? errorMessage(apiError, "lot") ?? undefined : fieldError(mutation.error, "quantityTotal");
  const buyerLimitError = fieldError(mutation.error, "maxPerBuyer");
  const showApiAlert = !nameConflict && !belowSold && hasUnmappedError(mutation.error, LOT_FIELDS);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="editar-lote"
      className="m-0 ml-auto h-full max-h-none w-full max-w-md border-l border-line bg-surface p-0 text-ink"
    >
      <Form onSubmit={submit} className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 id="editar-lote" className="text-lg font-semibold">
            {ed.title}
          </h2>
          <button type="button" onClick={() => ref.current?.close()} aria-label={ed.close} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <Field label={l.name} error={nameError}>
            <Input required maxLength={100} value={form.name} onChange={set("name")} />
          </Field>
          <Field label={l.description} hint={ed.descriptionHint}>
            <Input maxLength={500} value={form.description} onChange={set("description")} />
          </Field>
          <Field label={l.priceLabel} hint={ed.priceHint}>
            <Input required type="number" inputMode="decimal" min="0" max="100000" step="0.01" value={form.price} onChange={set("price")} />
          </Field>
          <Field label={l.quantityTotal} hint={ed.soldHint(lot.quantitySold)} error={quantityError}>
            <Input required type="number" inputMode="numeric" min={Math.max(1, lot.quantitySold)} max="1000000" step="1" value={form.quantityTotal} onChange={set("quantityTotal")} />
          </Field>
          <Field label={l.maxPerOrderLabel} hint={lot.maxPerOrder === null ? ed.maxPerOrderOptional : ed.maxPerOrderLocked}>
            <Input type="number" inputMode="numeric" min="1" max="100" step="1" value={form.maxPerOrder} onChange={set("maxPerOrder")} />
          </Field>
          <Field
            label={l.maxPerBuyerLabel}
            hint={ed.maxPerBuyerHint}
            error={buyerLimitError}
          >
            <Input type="number" inputMode="numeric" min="1" max="1000" step="1" value={form.maxPerBuyer} onChange={set("maxPerBuyer")} />
          </Field>
          {localError && <Alert>{localError}</Alert>}
          {mutation.error && showApiAlert && <Alert>{errorMessage(mutation.error)}</Alert>}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <Button variant="ghost" onClick={() => ref.current?.close()}>
            {ed.cancel}
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {ed.save}
          </Button>
        </div>
      </Form>
    </dialog>
  );
}
