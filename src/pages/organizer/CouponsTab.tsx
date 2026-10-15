import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, X } from "lucide-react";
import { createCoupon, deleteCoupon, listCoupons, updateCoupon } from "../../api/endpoints";
import type { Coupon, CouponSettings, DiscountType } from "../../api/types";
import { ConfirmButton } from "../../components/ConfirmDialog";
import { ErrorMessage, Loading } from "../../components/StateMessage";
import { Alert, Button, Field, Form, Input, Select } from "../../components/ui";
import { couponManagementError, couponStatus, couponStatusLabel, formatDiscount, normalizeCouponCode } from "../../utils/coupon";
import { formatInt, formatPrice, formatShortDate, fromInputDateTime, toInputDateTime } from "../../utils/format";
import { errorMessage } from "../../api/client";
import { getLocale, type Locale } from "../../i18n/locale";
import { useI18n } from "../../i18n/LocaleContext";
import { MESSAGES } from "../../i18n/messages";
import { STATUS_TONES } from "../../components/StatusBadge";

interface CouponForm {
  code: string;
  discountType: DiscountType;
  discountValue: string;
  maxUses: string;
  maxUsesPerBuyer: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

const EMPTY_FORM: CouponForm = {
  code: "",
  discountType: "PERCENT",
  discountValue: "",
  maxUses: "",
  maxUsesPerBuyer: "",
  startsAt: "",
  endsAt: "",
  active: true,
};
const CODE_PATTERN = /^[A-Z0-9_-]{3,30}$/;

const STATUS_STYLES = {
  active: STATUS_TONES.success,
  scheduled: STATUS_TONES.info,
  inactive: STATUS_TONES.muted,
  expired: STATUS_TONES.muted,
  exhausted: STATUS_TONES.danger,
} as const;

function toSettings(form: CouponForm, locale: Locale): CouponSettings | string {
  const errors = MESSAGES[locale].organizer.coupons.errors;
  const value = Math.round(Number(form.discountValue) * 100) / 100;
  if (form.discountValue.trim() === "" || !Number.isFinite(value) || value <= 0) return errors.discount;
  if (form.discountType === "PERCENT" && value > 100) return errors.percent;
  const maxUses = form.maxUses.trim() === "" ? null : Number(form.maxUses);
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) return errors.maxUses;
  const maxUsesPerBuyer = form.maxUsesPerBuyer.trim() === "" ? null : Number(form.maxUsesPerBuyer);
  if (maxUsesPerBuyer !== null && (!Number.isInteger(maxUsesPerBuyer) || maxUsesPerBuyer < 1)) {
    return errors.maxUsesPerBuyer;
  }
  const startsAt = form.startsAt ? fromInputDateTime(form.startsAt) : null;
  const endsAt = form.endsAt ? fromInputDateTime(form.endsAt) : null;
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) return errors.dates;
  return { discountType: form.discountType, discountValue: value, maxUses, startsAt, endsAt, active: form.active, maxUsesPerBuyer };
}

function settingsOf(coupon: Coupon, overrides: Partial<CouponSettings> = {}): CouponSettings {
  return {
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    maxUses: coupon.maxUses,
    startsAt: coupon.startsAt,
    endsAt: coupon.endsAt,
    active: coupon.active,
    maxUsesPerBuyer: coupon.maxUsesPerBuyer,
    ...overrides,
  };
}

function validity(coupon: Coupon, locale: Locale = getLocale()) {
  const c = MESSAGES[locale].organizer.coupons;
  if (!coupon.startsAt && !coupon.endsAt) return c.noDeadline;
  if (coupon.startsAt && coupon.endsAt) return c.between(formatShortDate(coupon.startsAt, locale), formatShortDate(coupon.endsAt, locale));
  return coupon.startsAt ? c.from(formatShortDate(coupon.startsAt, locale)) : c.until(formatShortDate(coupon.endsAt!, locale));
}

export default function CouponsTab({ eventId, cancelled }: { eventId: string; cancelled: boolean }) {
  const { t, locale } = useI18n();
  const c = t.organizer.coupons;
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
      <section className="tf-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{c.title}</h2>
            <p className="text-sm text-muted">{c.subtitle}</p>
          </div>
          {!cancelled && (
            <Button size="sm" variant={creating ? "ghost" : "primary"} onClick={() => setCreating((c) => !c)}>
              {creating ? c.close : <><Plus size={16} aria-hidden /> {c.newCoupon}</>}
            </Button>
          )}
        </div>
        {couponsQuery.isLoading && <div className="p-5"><Loading /></div>}
        {couponsQuery.error && <div className="p-5"><ErrorMessage message={errorMessage(couponsQuery.error) ?? ""} /></div>}
        {couponsQuery.data && coupons.length === 0 && <p className="p-5 text-sm text-muted">{c.empty}</p>}
        {actionError && <div className="px-5 pt-4"><Alert>{actionError}</Alert></div>}
        {coupons.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">{c.code}</th>
                  <th className="px-3 py-3 text-right font-medium">{c.discount}</th>
                  <th className="px-3 py-3 text-right font-medium">{c.uses}</th>
                  <th className="px-3 py-3 text-right font-medium">{c.paidOrders}</th>
                  <th className="px-3 py-3 text-right font-medium">{c.discountTotal}</th>
                  <th className="px-3 py-3 font-medium">{c.validity}</th>
                  <th className="px-3 py-3 font-medium">{c.status}</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">{c.actions}</span>
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
                        {formatInt(coupon.usesCount, locale)}
                        {coupon.maxUses !== null && ` / ${formatInt(coupon.maxUses, locale)}`}
                        {coupon.maxUsesPerBuyer !== null && (
                          <span className="block text-xs text-subtle">{c.perPerson(formatInt(coupon.maxUsesPerBuyer, locale))}</span>
                        )}
                      </td>
                      <td className="tabular px-3 py-3.5 text-right text-muted">{formatInt(coupon.paidOrders, locale)}</td>
                      <td className="tabular px-3 py-3.5 text-right text-muted">{formatPrice(coupon.discountTotal, locale)}</td>
                      <td className="px-3 py-3.5 text-muted">{validity(coupon, locale)}</td>
                      <td className="px-3 py-3.5">
                        <span className={`tf-status ${STATUS_STYLES[status]}`}>{couponStatusLabel(status, locale)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {!cancelled && (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setEditing(coupon)}>
                              <Pencil size={15} aria-hidden /> {c.edit}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              loading={toggle.isPending && toggle.variables?.id === coupon.id}
                              onClick={() => toggle.mutate(coupon)}
                            >
                              {coupon.active ? c.deactivate : c.reactivate}
                            </Button>
                            {!coupon.used && (
                              <ConfirmButton
                                variant="secondary"
                                title={c.deleteTitle(coupon.code)}
                                description={c.deleteText}
                                confirmLabel={c.deleteConfirm}
                                danger
                                loading={remove.isPending && remove.variables?.id === coupon.id}
                                onConfirm={() => remove.mutate(coupon)}
                              >
                                {c.delete}
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
  const { t } = useI18n();
  const c = t.organizer.coupons;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={c.type} hint={lockDiscount ? c.typeLocked : undefined}>
          <Select value={form.discountType} disabled={lockDiscount} onChange={(e) => set("discountType", e.target.value as DiscountType)}>
            <option value="PERCENT">{c.percent}</option>
            <option value="FIXED">{c.fixed}</option>
          </Select>
        </Field>
        <Field label={form.discountType === "PERCENT" ? c.discountPercent : c.discountFixed}>
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
      <Field label={c.maxUses} hint={c.maxUsesHint}>
        <Input type="number" inputMode="numeric" min="1" step="1" value={form.maxUses} onChange={(e) => set("maxUses", e.target.value)} />
      </Field>
      <Field
        label={c.maxUsesPerBuyer}
        hint={c.maxUsesPerBuyerHint}
      >
        <Input
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          value={form.maxUsesPerBuyer}
          onChange={(e) => set("maxUsesPerBuyer", e.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={c.startsAt} hint={c.optional}>
          <Input type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
        </Field>
        <Field label={c.endsAt} hint={c.optional}>
          <Input type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 shrink-0 accent-current" />
        {c.active}
      </label>
    </>
  );
}

function CouponCreator({ eventId, onCreated }: { eventId: string; onCreated: () => void }) {
  const { t, locale } = useI18n();
  const c = t.organizer.coupons;
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
    if (!CODE_PATTERN.test(code)) return setLocalError(c.errors.code);
    const settings = toSettings(form, locale);
    if (typeof settings === "string") return setLocalError(settings);
    mutation.mutate({ code, ...settings });
  }

  const error = localError ?? couponManagementError(mutation.error);

  return (
    <section className="tf-panel p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-ink">{c.newCoupon}</h2>
      <Form onSubmit={submit} className="space-y-4">
        <Field label={c.code} hint={c.codeHint}>
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
        {created && <Alert type="success">{c.created(created)}</Alert>}
        <Button type="submit" loading={mutation.isPending}>
          {c.create}
        </Button>
      </Form>
    </section>
  );
}

function CouponEditor({ eventId, coupon, onSaved, onClose }: { eventId: string; coupon: Coupon; onSaved: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t, locale } = useI18n();
  const c = t.organizer.coupons;
  const [form, setForm] = useState<CouponForm>({
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: String(coupon.discountValue),
    maxUses: coupon.maxUses === null ? "" : String(coupon.maxUses),
    maxUsesPerBuyer: coupon.maxUsesPerBuyer === null ? "" : String(coupon.maxUsesPerBuyer),
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
    const settings = toSettings(form, locale);
    if (typeof settings === "string") return setLocalError(settings);
    if (settings.maxUses !== null && settings.maxUses < coupon.usesCount) {
      return setLocalError(c.errors.belowUsed(coupon.usesCount));
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
      <Form onSubmit={submit} className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 id="editar-cupom" className="text-lg font-semibold">
            {c.editTitle} <span className="font-mono">{coupon.code}</span>
          </h2>
          <button type="button" onClick={() => ref.current?.close()} aria-label={c.close} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <p className="text-sm text-muted">{c.usage(formatInt(coupon.usesCount, locale), coupon.usesCount, formatInt(coupon.paidOrders, locale))}</p>
          <CouponFields form={form} set={set} lockDiscount={coupon.used} />
          {error && <Alert>{error}</Alert>}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <Button variant="ghost" onClick={() => ref.current?.close()}>
            {c.cancel}
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {c.save}
          </Button>
        </div>
      </Form>
    </dialog>
  );
}
