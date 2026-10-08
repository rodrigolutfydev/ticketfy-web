import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, X } from "lucide-react";
import { createCoupon, deleteCoupon, listCoupons, updateCoupon } from "../../api/endpoints";
import type { Coupon, CouponSettings, DiscountType } from "../../api/types";
import { ConfirmButton } from "../../components/ConfirmDialog";
import { ErrorMessage, Loading } from "../../components/StateMessage";
import { Alert, Button, Field, Input, Select } from "../../components/ui";
import { COUPON_STATUS_LABELS, couponManagementError, couponStatus, formatDiscount, normalizeCouponCode } from "../../utils/coupon";
import { formatInt, formatPrice, formatShortDate, fromInputDateTime, toInputDateTime } from "../../utils/format";

interface CouponForm {
  code: string;
  discountType: DiscountType;
  discountValue: string;
  maxUses: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

const EMPTY_FORM: CouponForm = { code: "", discountType: "PERCENT", discountValue: "", maxUses: "", startsAt: "", endsAt: "", active: true };
const CODE_PATTERN = /^[A-Z0-9_-]{3,30}$/;

const STATUS_STYLES = {
  active: "border-success/30 bg-success/12 text-success",
  scheduled: "border-line bg-raised text-muted",
  inactive: "border-line bg-raised text-muted",
  expired: "border-line bg-raised text-muted",
  exhausted: "border-warning/35 bg-warning/10 text-warning",
} as const;

function toSettings(form: CouponForm): CouponSettings | string {
  const value = Math.round(Number(form.discountValue) * 100) / 100;
  if (form.discountValue.trim() === "" || !Number.isFinite(value) || value <= 0) return "Informe um desconto maior que zero.";
  if (form.discountType === "PERCENT" && value > 100) return "O percentual vai de 0,01 a 100.";
  const maxUses = form.maxUses.trim() === "" ? null : Number(form.maxUses);
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) return "O limite de usos precisa ser um número inteiro maior que zero.";
  const startsAt = form.startsAt ? fromInputDateTime(form.startsAt) : null;
  const endsAt = form.endsAt ? fromInputDateTime(form.endsAt) : null;
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) return "O fim da validade precisa ser depois do início.";
  return { discountType: form.discountType, discountValue: value, maxUses, startsAt, endsAt, active: form.active };
}

function settingsOf(coupon: Coupon, overrides: Partial<CouponSettings> = {}): CouponSettings {
  return {
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    maxUses: coupon.maxUses,
    startsAt: coupon.startsAt,
    endsAt: coupon.endsAt,
    active: coupon.active,
    ...overrides,
  };
}

function validity(coupon: Coupon) {
  if (!coupon.startsAt && !coupon.endsAt) return "Sem prazo";
  if (coupon.startsAt && coupon.endsAt) return `${formatShortDate(coupon.startsAt)} até ${formatShortDate(coupon.endsAt)}`;
  return coupon.startsAt ? `A partir de ${formatShortDate(coupon.startsAt)}` : `Até ${formatShortDate(coupon.endsAt!)}`;
}

export default function CouponsTab({ eventId, cancelled }: { eventId: string; cancelled: boolean }) {
  const queryClient = useQueryClient();
  const couponsQuery = useQuery({ queryKey: ["coupons", eventId], queryFn: () => listCoupons(eventId) });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["coupons", eventId] });
    queryClient.invalidateQueries({ queryKey: ["event-dashboard", eventId] });
  };

  const toggle = useMutation({
    mutationFn: (coupon: Coupon) => updateCoupon(eventId, coupon.id, settingsOf(coupon, { active: !coupon.active })),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: (coupon: Coupon) => deleteCoupon(eventId, coupon.id), onSuccess: refresh });

  const coupons = couponsQuery.data ?? [];
  const actionError = couponManagementError(toggle.error ?? remove.error);

  return (
    <div className="space-y-6">
      <section className="elevated overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Cupons</h2>
            <p className="text-sm text-muted">O desconto vale sobre o subtotal do pedido e fica registrado no pedido.</p>
          </div>
          {!cancelled && (
            <Button size="sm" variant={creating ? "ghost" : "primary"} onClick={() => setCreating((c) => !c)}>
              {creating ? "Fechar" : <><Plus size={16} aria-hidden /> Novo cupom</>}
            </Button>
          )}
        </div>
        {couponsQuery.isLoading && <div className="p-5"><Loading /></div>}
        {couponsQuery.error && <div className="p-5"><ErrorMessage message={couponsQuery.error.message} /></div>}
        {couponsQuery.data && coupons.length === 0 && <p className="p-5 text-sm text-muted">Nenhum cupom criado para este evento.</p>}
        {actionError && <div className="px-5 pt-4"><Alert>{actionError}</Alert></div>}
        {coupons.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">Código</th>
                  <th className="px-3 py-3 text-right font-medium">Desconto</th>
                  <th className="px-3 py-3 text-right font-medium">Usos</th>
                  <th className="px-3 py-3 text-right font-medium">Pedidos pagos</th>
                  <th className="px-3 py-3 text-right font-medium">Desconto concedido</th>
                  <th className="px-3 py-3 font-medium">Validade</th>
                  <th className="px-3 py-3 font-medium">Situação</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => {
                  const status = couponStatus(coupon);
                  return (
                    <tr key={coupon.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-3.5 font-mono font-semibold tracking-wide text-ink">{coupon.code}</td>
                      <td className="tabular px-3 py-3.5 text-right font-semibold text-ink">{formatDiscount(coupon.discountType, coupon.discountValue)}</td>
                      <td className="tabular px-3 py-3.5 text-right text-muted">
                        {formatInt(coupon.usesCount)}
                        {coupon.maxUses !== null && ` / ${formatInt(coupon.maxUses)}`}
                      </td>
                      <td className="tabular px-3 py-3.5 text-right text-muted">{formatInt(coupon.paidOrders)}</td>
                      <td className="tabular px-3 py-3.5 text-right text-muted">{formatPrice(coupon.discountTotal)}</td>
                      <td className="px-3 py-3.5 text-muted">{validity(coupon)}</td>
                      <td className="px-3 py-3.5">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>{COUPON_STATUS_LABELS[status]}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {!cancelled && (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setEditing(coupon)}>
                              <Pencil size={15} aria-hidden /> Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              loading={toggle.isPending && toggle.variables?.id === coupon.id}
                              onClick={() => toggle.mutate(coupon)}
                            >
                              {coupon.active ? "Desativar" : "Reativar"}
                            </Button>
                            {!coupon.used && (
                              <ConfirmButton
                                variant="secondary"
                                title={`Excluir o cupom ${coupon.code}?`}
                                description="O cupom ainda não foi usado e será apagado."
                                confirmLabel="Excluir cupom"
                                danger
                                loading={remove.isPending && remove.variables?.id === coupon.id}
                                onConfirm={() => remove.mutate(coupon)}
                              >
                                Excluir
                              </ConfirmButton>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {creating && !cancelled && <CouponCreator eventId={eventId} onCreated={refresh} />}
      {editing && <CouponEditor eventId={eventId} coupon={editing} onSaved={refresh} onClose={() => setEditing(null)} />}
    </div>
  );
}

function CouponFields({ form, set, lockDiscount }: {
  form: CouponForm;
  set: <K extends keyof CouponForm>(field: K, value: CouponForm[K]) => void;
  lockDiscount: boolean;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo" hint={lockDiscount ? "Fixo depois do primeiro uso." : undefined}>
          <Select value={form.discountType} disabled={lockDiscount} onChange={(e) => set("discountType", e.target.value as DiscountType)}>
            <option value="PERCENT">Percentual (%)</option>
            <option value="FIXED">Valor fixo (R$)</option>
          </Select>
        </Field>
        <Field label={form.discountType === "PERCENT" ? "Desconto (%)" : "Desconto (R$)"}>
          <Input
            required
            type="number"
            inputMode="decimal"
            min="0.01"
            max={form.discountType === "PERCENT" ? "100" : "100000"}
            step="0.01"
            disabled={lockDiscount}
            value={form.discountValue}
            onChange={(e) => set("discountValue", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Limite de usos" hint="Opcional. Pedido pendente que expira ou é cancelado devolve o uso.">
        <Input type="number" inputMode="numeric" min="1" step="1" value={form.maxUses} onChange={(e) => set("maxUses", e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Início da validade" hint="Opcional.">
          <Input type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
        </Field>
        <Field label="Fim da validade" hint="Opcional.">
          <Input type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 shrink-0 accent-current" />
        Ativo
      </label>
    </>
  );
}

function CouponCreator({ eventId, onCreated }: { eventId: string; onCreated: () => void }) {
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [localError, setLocalError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof createCoupon>[1]) => createCoupon(eventId, input),
    onSuccess: (coupon) => {
      setForm(EMPTY_FORM);
      setCreated(coupon.code);
      onCreated();
    },
  });

  const set = <K extends keyof CouponForm>(field: K, value: CouponForm[K]) => {
    setLocalError(null);
    setCreated(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    const code = normalizeCouponCode(form.code);
    if (!CODE_PATTERN.test(code)) return setLocalError("O código precisa ter de 3 a 30 letras, números, - ou _.");
    const settings = toSettings(form);
    if (typeof settings === "string") return setLocalError(settings);
    mutation.mutate({ code, ...settings });
  }

  const error = localError ?? couponManagementError(mutation.error);

  return (
    <section className="elevated rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-ink">Novo cupom</h2>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Código" hint="Sem diferença entre maiúsculas e minúsculas. Não pode ser alterado depois.">
          <Input
            required
            maxLength={30}
            autoComplete="off"
            spellCheck={false}
            value={form.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            placeholder="BLACKFRIDAY"
          />
        </Field>
        <CouponFields form={form} set={set} lockDiscount={false} />
        {error && <Alert>{error}</Alert>}
        {created && <Alert type="success">Cupom {created} criado.</Alert>}
        <Button type="submit" loading={mutation.isPending}>
          Criar cupom
        </Button>
      </form>
    </section>
  );
}

function CouponEditor({ eventId, coupon, onSaved, onClose }: { eventId: string; coupon: Coupon; onSaved: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<CouponForm>({
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: String(coupon.discountValue),
    maxUses: coupon.maxUses === null ? "" : String(coupon.maxUses),
    startsAt: toInputDateTime(coupon.startsAt),
    endsAt: toInputDateTime(coupon.endsAt),
    active: coupon.active,
  });
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const mutation = useMutation({
    mutationFn: (settings: CouponSettings) => updateCoupon(eventId, coupon.id, settings),
    onSuccess: () => {
      onSaved();
      ref.current?.close();
    },
  });

  const set = <K extends keyof CouponForm>(field: K, value: CouponForm[K]) => {
    setLocalError(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    const settings = toSettings(form);
    if (typeof settings === "string") return setLocalError(settings);
    if (settings.maxUses !== null && settings.maxUses < coupon.usesCount) {
      return setLocalError(`O limite não pode ficar abaixo dos ${coupon.usesCount} usos já feitos.`);
    }
    mutation.mutate(settings);
  }

  const error = localError ?? couponManagementError(mutation.error);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="editar-cupom"
      className="m-0 ml-auto h-full max-h-none w-full max-w-md border-l border-line bg-surface p-0 text-ink"
    >
      <form onSubmit={submit} noValidate className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 id="editar-cupom" className="text-lg font-semibold">
            Editar cupom <span className="font-mono">{coupon.code}</span>
          </h2>
          <button type="button" onClick={() => ref.current?.close()} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <p className="text-sm text-muted">
            {formatInt(coupon.usesCount)} {coupon.usesCount === 1 ? "uso" : "usos"}, {formatInt(coupon.paidOrders)} em pedidos pagos. Pedidos já feitos mantêm o desconto da compra.
          </p>
          <CouponFields form={form} set={set} lockDiscount={coupon.used} />
          {error && <Alert>{error}</Alert>}
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
