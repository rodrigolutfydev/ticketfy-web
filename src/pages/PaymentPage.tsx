import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  Link,
  Navigate,
  useNavigate,
  useParams,
} from "react-router";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  Check,
  Clock3,
  Copy,
  CreditCard,
  Loader2,
  Lock,
  QrCode,
  ShieldCheck,
} from "lucide-react";

import { errorMessage } from "../api/client";

import {
  cancelOrder,
  getOrder,
  payOrder,
  type PixPaymentResponse,
} from "../api/endpoints";

import CheckoutSummary from "../components/CheckoutSummary";
import MobileActionBar from "../components/MobileActionBar";
import ConfirmDialog from "../components/ConfirmDialog";
import { ReservationTimer } from "../components/Countdown";
import { ErrorMessage, Loading } from "../components/StateMessage";
import { Alert, BackLink, Button } from "../components/ui";

import { formatPrice, shortId } from "../utils/format";
import { isValidId } from "../utils/security";
import NotFoundPage from "./NotFoundPage";
import { usePageTitle } from "../hooks/usePageTitle";
import { useI18n } from "../i18n/LocaleContext";

// Converte imagens base64 retornadas pela API.
// Não carrega imagens de URLs externas.
function getQrImageSource(value: string): string | null {
  const qr = value.trim();

  if (!qr) return null;

  if (
    /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(qr)
  ) {
    return qr;
  }

  if (/^iVBORw0KGgo[A-Za-z0-9+/=]+$/.test(qr)) {
    return `data:image/png;base64,${qr}`;
  }

  if (/^\/9j\/[A-Za-z0-9+/=]+$/.test(qr)) {
    return `data:image/jpeg;base64,${qr}`;
  }

  return null;
}

export default function PaymentPage() {
  const { t, locale } = useI18n();

  usePageTitle(t.payment.pageTitle);

  const { id = "" } = useParams();

  const validId = isValidId(id);

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const [confirmCancel, setConfirmCancel] = useState(false);

  const [method, setMethod] = useState<"pix" | "card">("pix");

  const [pix, setPix] = useState<PixPaymentResponse | null>(null);

  const [copied, setCopied] = useState(false);

  const [copyError, setCopyError] = useState(false);

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["order", id],

    queryFn: () => getOrder(id),

    enabled: validId,

    // Consulta a API Java enquanto aguarda confirmação.
    refetchInterval: pix ? 5000 : false,

    refetchIntervalInBackground: false,
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["order", id],
    });

    void queryClient.invalidateQueries({
      queryKey: ["orders"],
    });

    void queryClient.invalidateQueries({
      queryKey: ["tickets"],
    });

    void queryClient.invalidateQueries({
      queryKey: ["ticket-types"],
    });
  }, [queryClient, id]);

  const pay = useMutation({
    mutationFn: () => payOrder(id),

    onSuccess: (response) => {
      // Criar cobrança não significa pagamento aprovado.
      setPix(response);

      setCopied(false);
      setCopyError(false);

      invalidate();
    },
  });

  const cancel = useMutation({
    mutationFn: () => cancelOrder(id),

    onSuccess: () => {
      invalidate();

      navigate(`/orders/${id}`, {
        replace: true,
      });
    },
  });

  // O status PAID precisa vir do backend Java.
  useEffect(() => {
    if (order?.status !== "PAID") return;

    invalidate();

    navigate(`/orders/${id}/confirmation`, {
      replace: true,
    });
  }, [order?.status, id, navigate, invalidate]);

  const onExpire = useCallback(() => {
    window.setTimeout(() => {
      void refetch();
    }, 3000);
  }, [refetch]);

  async function copyPix() {
    if (!pix?.pixCopyPaste) return;

    try {
      await navigator.clipboard.writeText(
        pix.pixCopyPaste,
      );

      setCopied(true);
      setCopyError(false);

      window.setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  }

  if (!validId) {
    return <NotFoundPage />;
  }

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={errorMessage(error) ?? ""}
      />
    );
  }

  if (!order) {
    return <NotFoundPage />;
  }

  const o = order;

  if (o.status === "PAID") {
    return <Loading />;
  }

  if (o.status !== "PENDING") {
    return (
      <Navigate
        to={`/orders/${id}`}
        replace
      />
    );
  }

  const busy = pay.isPending || cancel.isPending;

  const pixCreated = pix !== null;

  const qrImage = pix
    ? getQrImageSource(pix.pixQrCode ?? "")
    : null;

  const hasCopyPaste = Boolean(
    pix?.pixCopyPaste?.trim(),
  );

  function generatePix() {
    if (busy || pixCreated || method !== "pix") {
      return;
    }

    pay.mutate();
  }

  return (
    <div className="grid items-start gap-8 pb-28 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12 lg:pb-0">
      {/* CONTEÚDO PRINCIPAL */}
      <div>
        <BackLink to="/orders">
          {t.payment.myOrders}
        </BackLink>

        <h1 className="mt-6 text-[clamp(1.875rem,3.4vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.045em] text-ink">
          {pixCreated
            ? "Pagamento via Pix"
            : t.payment.title}
        </h1>

        <p className="mt-2.5 text-muted">
          {t.payment.order(shortId(o.id))}
        </p>

        <div className="mt-6">
          <ReservationTimer
            from={o.createdAt}
            until={o.expiresAt}
            label={t.payment.reservedFor}
            onExpire={onExpire}
          />
        </div>

        {/* MÉTODOS DE PAGAMENTO */}
        {!pixCreated && (
          <div
            className="mt-5 grid gap-3 sm:grid-cols-2"
            role="radiogroup"
            aria-label={t.payment.methodLabel}
          >
            <MethodOption
              selected={method === "pix"}
              onSelect={() => setMethod("pix")}
              icon={<QrCode size={22} />}
              title="Pix"
              hint="Confirmação automática após pagamento"
            />

            <MethodOption
              selected={method === "card"}
              onSelect={() => setMethod("card")}
              icon={<CreditCard size={22} />}
              title={t.payment.card}
              hint="Indisponível no momento"
              disabled
            />
          </div>
        )}

        {/* INSTRUÇÕES ANTES DE GERAR */}
        {!pixCreated && (
          <div className="tf-panel mt-4 p-6 sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                <QrCode size={24} />
              </div>

              <div>
                <h2 className="text-xl font-bold tracking-[-0.03em] text-ink">
                  Pagamento via Pix
                </h2>

                <p className="mt-1 text-sm text-muted">
                  Gere o código Pix para concluir sua compra.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <Step
                number={1}
                title="Confira seu pedido"
                description="Verifique os ingressos e o valor total."
              />

              <Step
                number={2}
                title="Gere o código Pix"
                description="Uma cobrança será vinculada ao seu pedido."
              />

              <Step
                number={3}
                title="Aguarde a confirmação"
                description="Os ingressos serão liberados somente após a confirmação do pagamento."
              />
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-line bg-field p-4">
              <ShieldCheck
                size={20}
                className="shrink-0 text-accent-text"
              />

              <p className="text-sm leading-relaxed text-muted">
                Gerar o Pix não confirma o pagamento.
                A liberação dos ingressos depende da
                confirmação pelo sistema.
              </p>
            </div>
          </div>
        )}

        {/* PIX GERADO */}
        {pixCreated && (
          <div className="tf-panel mt-5 p-6 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-text">
                <QrCode size={28} />
              </div>

              <h2 className="mt-5 text-2xl font-bold tracking-tight text-ink">
                Seu Pix está pronto
              </h2>

              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                Escaneie o QR Code ou utilize o Pix
                copia e cola para realizar o pagamento.
              </p>

              <div className="mt-6 text-3xl font-extrabold text-ink">
                {formatPrice(o.totalAmount, locale)}
              </div>

              {/* IMAGEM DO QR CODE */}
              {qrImage ? (
                <div className="mt-7 rounded-2xl bg-white p-5">
                  <img
                    src={qrImage}
                    alt="QR Code para pagamento Pix"
                    className="h-56 w-56 object-contain sm:h-64 sm:w-64"
                  />
                </div>
              ) : (
                <div className="mt-7 flex w-full max-w-sm flex-col items-center rounded-2xl border border-line bg-field p-6">
                  <QrCode
                    size={48}
                    className="text-accent-text"
                  />

                  <p className="mt-3 text-sm text-muted">
                    {hasCopyPaste
                      ? "Utilize o código Pix copia e cola abaixo."
                      : "O QR Code não está disponível nesta resposta."}
                  </p>
                </div>
              )}

              {/* CÓDIGO PIX */}
              {hasCopyPaste && (
                <div className="mt-6 w-full">
                  <p className="mb-3 text-left text-sm font-semibold text-ink">
                    Pix copia e cola
                  </p>

                  <div className="rounded-xl border border-line bg-field p-4">
                    <p className="break-all text-left font-mono text-xs leading-relaxed text-muted">
                      {pix.pixCopyPaste}
                    </p>
                  </div>

                  <Button
                    size="lg"
                    className="mt-3 w-full"
                    onClick={copyPix}
                  >
                    {copied ? (
                      <>
                        <Check size={18} />
                        Código copiado!
                      </>
                    ) : (
                      <>
                        <Copy size={18} />
                        Copiar código Pix
                      </>
                    )}
                  </Button>

                  {copyError && (
                    <p className="mt-2 text-sm text-muted">
                      Não foi possível copiar automaticamente.
                      Selecione o código acima para copiá-lo.
                    </p>
                  )}
                </div>
              )}

              {/* STATUS */}
              <div className="mt-7 w-full rounded-xl border border-line bg-field p-5">
                <div className="flex items-center justify-center gap-3">
                  <Loader2
                    size={20}
                    className="animate-spin text-accent-text"
                  />

                  <span
                    className="font-semibold text-ink"
                    role="status"
                  >
                    Aguardando pagamento
                  </span>
                </div>

                <p className="mt-2 text-sm text-muted">
                  Estamos verificando o status do seu pedido.
                </p>

                <p className="mt-1 text-xs text-muted">
                  A confirmação pode levar alguns instantes.
                </p>
              </div>

              <div className="mt-5 flex items-center gap-2 text-xs text-muted">
                <Clock3 size={15} />
                Pedido sujeito ao prazo de reserva.
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={() => void refetch()}
              >
                Verificar pagamento
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* RESUMO */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-24">
        <CheckoutSummary
          total={o.totalAmount}
          discount={
            o.couponCode
              ? {
                  code: o.couponCode,
                  amount: o.discountAmount,
                  subtotal: o.subtotalAmount,
                }
              : null
          }
          lines={o.items.map((item) => ({
            key: item.ticketTypeId,
            label: item.ticketTypeName,
            quantity: item.quantity,
            subtotal: item.subtotal,
          }))}
        />

        {(pay.error || cancel.error) && (
          <Alert>
            {errorMessage(pay.error ?? cancel.error)}
          </Alert>
        )}

        {/* GERAR PIX — DESKTOP */}
        {!pixCreated && (
          <div className="hidden lg:block">
            <Button
              size="lg"
              className="w-full"
              loading={pay.isPending}
              disabled={busy || method !== "pix"}
              onClick={generatePix}
            >
              <Lock size={16} aria-hidden />

              {`Gerar Pix de ${formatPrice(
                o.totalAmount,
                locale,
              )}`}
            </Button>
          </div>
        )}

        {/* PAGAMENTO PENDENTE */}
        {pixCreated && (
          <div className="hidden rounded-xl border border-line bg-field p-4 lg:block">
            <div className="flex items-center gap-2">
              <Loader2
                size={17}
                className="animate-spin text-accent-text"
              />

              <span className="text-sm font-semibold text-ink">
                Pagamento pendente
              </span>
            </div>

            <p className="mt-2 text-sm text-muted">
              Seus ingressos serão disponibilizados
              após a confirmação do pagamento.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Link
            to="/orders"
            className="text-sm font-semibold text-accent-text hover:underline"
          >
            {t.payment.payLater}
          </Link>

          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => setConfirmCancel(true)}
          >
            {t.payment.cancelOrder}
          </Button>
        </div>
      </div>

      {/* AÇÃO MOBILE */}
      {!pixCreated && (
        <MobileActionBar
          label={t.checkout.barTotal}
          total={formatPrice(o.totalAmount, locale)}
          message={
            pay.error || cancel.error
              ? errorMessage(pay.error ?? cancel.error)
              : undefined
          }
        >
          <Button
            size="lg"
            loading={pay.isPending}
            disabled={busy || method !== "pix"}
            onClick={generatePix}
          >
            <QrCode size={16} aria-hidden />
            Gerar Pix
          </Button>
        </MobileActionBar>
      )}

      {/* CANCELAMENTO */}
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

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-text">
        {number}
      </span>

      <div>
        <p className="font-semibold text-ink">
          {title}
        </p>

        <p className="mt-1 text-sm leading-relaxed text-muted">
          {description}
        </p>
      </div>
    </div>
  );
}

function MethodOption({
  selected,
  onSelect,
  icon,
  title,
  hint,
  disabled = false,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  hint: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`flex items-center gap-3.5 rounded-2xl px-[18px] py-4 text-left transition-[box-shadow,background-color] ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : selected
            ? "bg-[color-mix(in_srgb,var(--accent)_9%,var(--field))] shadow-[inset_0_0_0_1.5px_var(--accent)]"
            : "bg-field shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1px_var(--line-strong)]"
      }`}
    >
      <span
        className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl ${
          selected
            ? "bg-accent text-accent-ink"
            : "bg-ink/[0.05] text-muted"
        }`}
      >
        {icon}
      </span>

      <span className="flex-1">
        <span className="block font-semibold text-ink">
          {title}
        </span>

        <span className="block text-sm text-muted">
          {hint}
        </span>
      </span>

      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
          selected
            ? "border-accent"
            : "border-line-strong"
        }`}
        aria-hidden
      >
        {selected && (
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        )}
      </span>
    </button>
  );
}