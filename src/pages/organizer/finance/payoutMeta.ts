import type { Balance, DocumentType, PayoutAccount, PayoutStatus, PixKeyType } from "../../../api/types";
import { formatDate, formatPrice, formatTime } from "../../../utils/format";

export const DOCUMENT_LABELS: Record<DocumentType, string> = { CPF: "CPF", CNPJ: "CNPJ" };

export const PIX_KEY_LABELS: Record<PixKeyType, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  PHONE: "Telefone",
  RANDOM: "Chave aleatória",
};

export const PIX_KEY_PLACEHOLDERS: Record<PixKeyType, string> = {
  CPF: "000.000.000-00",
  CNPJ: "00.000.000/0000-00",
  EMAIL: "voce@exemplo.com",
  PHONE: "+55 (11) 91234-5678",
  RANDOM: "123e4567-e89b-12d3-a456-426614174000",
};

export const PAYOUT_STATUS_META: Record<PayoutStatus, [string, string]> = {
  UNDER_REVIEW: ["Em análise", "text-accent-text bg-accent/12 border-accent/30"],
  REQUESTED: ["Solicitado", "text-warning bg-warning/12 border-warning/30"],
  PROCESSING: ["Em processamento", "text-info bg-info/12 border-info/30"],
  PAID: ["Pago", "text-success bg-success/12 border-success/30"],
  FAILED: ["Falhou", "text-danger bg-danger/10 border-danger/30"],
  CANCELLED: ["Cancelado", "text-muted bg-raised border-line"],
  REJECTED: ["Recusado", "text-danger bg-danger/10 border-danger/30"],
};

export const CANCELLABLE_STATUSES: PayoutStatus[] = ["UNDER_REVIEW", "REQUESTED"];

export const formatDateTime = (iso: string) => `${formatDate(iso)} às ${formatTime(iso)}`;

export function payoutBlockedReason(balance: Balance, account: PayoutAccount | null): string | null {
  if (balance.payoutsBlocked) return "Os saques desta conta estão bloqueados pela equipe do Ticketfy.";
  if (!account) return "Cadastre os dados de recebimento para sacar.";
  if (account.payoutsBlockedUntil) {
    return `Saques bloqueados até ${formatDateTime(account.payoutsBlockedUntil)} por causa da troca da chave Pix.`;
  }
  if (balance.inPayout > 0) return "Já existe um saque em andamento.";
  if (balance.available < 0) return "O saldo disponível está negativo.";
  if (balance.available < balance.minPayoutAmount) {
    return `O saldo disponível está abaixo do mínimo para saque (${formatPrice(balance.minPayoutAmount)}).`;
  }
  return null;
}
