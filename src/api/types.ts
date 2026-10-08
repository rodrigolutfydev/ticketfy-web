// Tipos que espelham os DTOs da API (os records do Java).
// O TypeScript usa isso só para checar o código enquanto você escreve:
// nada aqui existe em tempo de execução nem valida a resposta da API.
// Campos com "?" são opcionais: a tela precisa funcionar sem eles.

export interface Page<T> {
  content: T[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}

export interface TokenResponse {
  token: string;
  expiresIn: number;
}

export interface UserDetails {
  id: string;
  name: string;
  email: string;
}

export type Role = "USER" | "ORGANIZER" | "ADMIN";

// Resposta de GET /users/me
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  // Foto de perfil (https). null quando o usuário não tem foto.
  avatarUrl?: string | null;
}

export interface EventSummary {
  id: string;
  name: string;
  venueName: string;
  city: string;
  startsAt: string;
  // URL https da foto de capa. Opcional: sem ela, a tela mostra uma capa gerada.
  imageUrl?: string | null;
  // Marcado por um ADMIN. A vitrine da página inicial mostra só estes.
  featured?: boolean;
  minPrice: number | null;
  soldOut: boolean;
  cancelledAt?: string | null;
}

export interface EventDetails extends Omit<EventSummary, "minPrice" | "soldOut"> {
  description?: string;
  address?: string;
  state?: string;
  endsAt?: string | null;
  organizerName?: string;
  // Necessário para saber se o evento é do usuário logado.
  organizerId?: string;
  cancellationReason?: string | null;
}

export interface EventCancellationResult {
  eventId: string;
  cancelledAt: string;
  refundedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  requiresManualAction: number;
}

export interface EventInput {
  name: string;
  description: string;
  venueName: string;
  address: string;
  city: string;
  state: string;
  startsAt: string;
  endsAt: string | null;
  imageUrl: string | null;
}

// Rota pública de lotes. A API não revela quantos ingressos restam, a não
// ser quando está acabando: remaining vem preenchido só com 1 a 10 restantes.
export interface TicketTypeSummary {
  id: string;
  name: string;
  description: string | null;
  price: number;
  maxPerOrder: number | null;
  soldOut: boolean;
  remaining: number | null;
}

// Rota do organizador (/manage) e resposta de criação/edição de lote.
export interface TicketTypeDetails {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantityTotal: number;
  quantitySold: number; // pagos + reservados em pedidos pendentes
  available: number;
  maxPerOrder: number | null;
  active: boolean;
}

// Edição parcial: só os campos enviados mudam.
export interface TicketTypeUpdate {
  name?: string;
  description?: string; // "" remove a descrição
  price?: number;
  quantityTotal?: number;
  maxPerOrder?: number;
}

export interface TicketTypeInput {
  name: string;
  description: string;
  price: number;
  quantityTotal: number;
  maxPerOrder: number | null;
}

export type OrderStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" | "REFUNDED";

export interface OrderItem {
  ticketTypeId: string;
  ticketTypeName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderDetails {
  id: string;
  status: OrderStatus;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  couponCode: string | null;
  expiresAt: string;
  createdAt: string | null;
  items: OrderItem[];
  tickets: OrderTicket[];
  eventCancelled?: boolean;
}

export type DiscountType = "PERCENT" | "FIXED";

export interface Coupon {
  id: string;
  eventId: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses: number | null;
  usesCount: number;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  used: boolean;
  paidOrders: number;
  discountTotal: number;
  createdAt: string;
}

export interface CouponSettings {
  discountType: DiscountType;
  discountValue: number;
  maxUses: number | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
}

export interface CouponInput extends CouponSettings {
  code: string;
}

export interface CouponPreview {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  subtotal: number;
  discount: number;
  total: number;
}

export interface OrderTicket {
  id: string;
  ticketTypeName: string;
  status: TicketStatus;
  code: string | null;
  transferred: boolean;
}

export interface OrderSummary {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt?: string | null;
  expiresAt?: string;
}

export interface PaymentDetails {
  id: string;
  orderId: string;
  status: string;
  method: string;
  amount: number;
  approvedAt: string | null;
  refundedAt?: string | null;
  createdAt: string | null;
}

export type TicketStatus = "VALID" | "USED" | "CANCELLED";

export interface TicketDetails {
  id: string;
  code: string;
  status: TicketStatus;
  eventName: string;
  eventStartsAt: string;
  ticketTypeName: string;
  usedAt: string | null;
  createdAt: string | null;
  transferable: boolean;
}

export interface TicketTransferResult {
  ticketId: string;
  transferredAt: string;
}

// ---------------------------------------------------------------------------
// Dashboard do organizador (docs/CONTRATO-DASHBOARD.md na API)
// Percentuais vão de 0 a 100. Campos null = não dá para calcular (mostrar "—").
// ---------------------------------------------------------------------------

export interface EventDashboard {
  eventId: string;
  eventName: string;
  startsAt: string;
  timeZone: string;
  generatedAt: string;
  totals: {
    ticketsSold: number;
    ticketsReserved: number;
    capacity: number;
    remaining: number;
    percentSold: number | null;
    revenue: number;
    platformFee: number;
    netRevenue: number;
    paidOrders: number;
    averageOrderValue: number | null;
    averageTicketPrice: number | null;
    discounts: number;
  };
  ordersByStatus: { status: OrderStatus; orders: number; tickets: number }[];
  checkIn: { checkedIn: number; issued: number; attendanceRate: number | null };
  ticketTypes: {
    id: string;
    name: string;
    price: number;
    quantityTotal: number;
    sold: number;
    reserved: number;
    remaining: number;
    revenue: number;
    percentSold: number | null;
  }[];
  dailySales: { date: string; tickets: number; revenue: number }[];
  coupons: {
    id: string;
    code: string;
    active: boolean;
    uses: number;
    maxUses: number | null;
    paidOrders: number;
    discountTotal: number;
  }[];
}

export interface EventOrderRow {
  orderId: string;
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
  buyer: { name: string; email: string };
  items: { ticketTypeId: string; ticketTypeName: string; quantity: number; unitPrice: number; subtotal: number }[];
  total: number;
  platformFee: number;
  netAmount: number;
  subtotal: number;
  discount: number;
  couponCode: string | null;
}

export interface OrganizerDashboard {
  totals: { events: number; ticketsSold: number; revenue: number; platformFee: number; netRevenue: number; discounts: number };
  events: Page<{
    eventId: string;
    name: string;
    startsAt: string;
    imageUrl: string | null;
    ticketsSold: number;
    capacity: number;
    percentSold: number | null;
    revenue: number;
    platformFee: number;
    netRevenue: number;
    discounts: number;
  }>;
}

export interface Balance {
  pending: number;
  available: number;
  inPayout: number;
  held: number;
  total: number;
  releaseDelayDays: number;
  minPayoutAmount: number;
  payoutsBlocked: boolean;
}

export type LedgerEntryType = "SALE_CREDIT" | "REFUND_DEBIT" | "PAYOUT_DEBIT" | "PAYOUT_REVERSAL";

export interface LedgerEntry {
  id: string;
  type: LedgerEntryType;
  amount: number;
  eventId: string | null;
  eventName: string | null;
  orderId: string | null;
  payoutId: string | null;
  createdAt: string;
}

export type DocumentType = "CPF" | "CNPJ";
export type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM";

export interface PayoutAccount {
  documentType: DocumentType;
  document: string;
  holderName: string;
  pixKeyType: PixKeyType;
  pixKey: string;
  payoutsBlockedUntil: string | null;
  updatedAt: string | null;
}

export interface PayoutAccountInput {
  documentType: DocumentType;
  document: string;
  holderName: string;
  pixKeyType: PixKeyType;
  pixKey: string;
  password: string;
}

export type PayoutStatus = "UNDER_REVIEW" | "REQUESTED" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED" | "REJECTED";

export interface Payout {
  id: string;
  amount: number;
  status: PayoutStatus;
  pixKeyType: PixKeyType;
  pixKey: string;
  holderName: string;
  requestedAt: string;
  processingStartedAt: string | null;
  finishedAt: string | null;
  failureReason: string | null;
  rejectionReason: string | null;
}

export interface AdminPayout {
  id: string;
  organizerId: string;
  organizerName: string | null;
  organizerEmail: string | null;
  amount: number;
  status: PayoutStatus;
  pixKeyType: PixKeyType;
  pixKey: string;
  holderName: string;
  requestedAt: string;
  organizerPayoutsBlocked: boolean;
}

export interface OrganizerPayoutStatus {
  id: string;
  name: string;
  email: string;
  payoutsBlocked: boolean;
  blockReason: string | null;
  blockedAt: string | null;
  blockedBy: string | null;
}

export type AuditTargetType = "PAYOUT_ACCOUNT" | "PAYOUT" | "ORGANIZER" | "EVENT" | "TICKET_TYPE" | "TICKET" | "USER" | "COUPON";

export type AuditAction =
  | "PAYOUT_ACCOUNT_SAVED"
  | "PAYOUT_REQUESTED"
  | "PAYOUT_SENT_TO_REVIEW"
  | "PAYOUT_APPROVED"
  | "PAYOUT_REJECTED"
  | "PAYOUT_CANCELLED"
  | "PAYOUT_PAID"
  | "PAYOUT_FAILED"
  | "PAYOUTS_BLOCKED"
  | "PAYOUTS_UNBLOCKED"
  | "EVENT_FEATURED"
  | "EVENT_UNFEATURED"
  | "TICKET_TYPE_PRICE_CHANGED"
  | "EVENT_CANCELLED"
  | "PASSWORD_CHANGED"
  | "SESSION_REUSE_DETECTED"
  | "TICKET_TRANSFERRED"
  | "COUPON_CREATED"
  | "COUPON_UPDATED"
  | "COUPON_DEACTIVATED"
  | "COUPON_REACTIVATED"
  | "COUPON_DELETED";

export interface AuditEntry {
  id: string;
  actorType: "USER" | "SYSTEM";
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  details: Record<string, unknown>;
  correlationId: string | null;
  createdAt: string;
}
