// Uma função por rota da API. As telas nunca montam URL na mão:
// chamam getEvent(id), createOrder(...) etc. Se uma rota mudar no backend,
// só este arquivo muda.

import { ApiError, api, apiDownload, authApi } from "./client";
import { participantsQuery } from "../utils/participants";
import type {
  EventCancellationResult, EventCategory, EventCategoryCount, EventDashboard, EventDetails, EventInput, EventOrderRow, EventSummary, OrderDetails, OrderStatus, OrderSummary,
  AdminPayout, AdminUser, AuditEntry, AuditTargetType, Balance, Coupon, CouponInput, CouponPreview, CouponSettings, LedgerEntry, OrganizerDashboard, OrganizerPayoutStatus, Page, Payout,
  Participant, ParticipantFilters, PayoutAccount, PayoutAccountInput, PaymentDetails, TicketDetails, TicketTransferResult, TicketTypeDetails, TicketTypeInput, TicketTypeSummary,
  TicketTypeUpdate, TokenResponse, UserDetails, UserProfile,
} from "./types";

// Codifica um pedaço variável da rota (um ID, um código).
// encodeURIComponent transforma "/" em "%2F", "?" em "%3F" etc., então um
// valor malicioso nunca consegue "sair" do seu lugar na URL.
const seg = (value: string) => encodeURIComponent(value);

// Usuários e autenticação
export const register = (data: { name: string; email: string; password: string; language?: string }) =>
  api.post<UserDetails>("/users", data);
export const login = (data: { email: string; password: string }) => authApi.post<TokenResponse>("/auth/login", data);
export const logoutAll = () => authApi.post<void>("/auth/logout-all", undefined, { authenticated: true });
export const changePassword = (data: { currentPassword: string; newPassword: string }) =>
  authApi.patch<TokenResponse>("/users/me/password", data, { authenticated: true });
export const becomeOrganizer = () => api.post<void>("/users/me/organizer");
export const getMe = () => api.get<UserProfile>("/users/me");
// "" remove a foto; uma URL https troca.
export const updateAvatar = (avatarUrl: string) => api.patch<UserProfile>("/users/me/avatar", { avatarUrl });
export const updateLanguage = (language: string) => api.patch<UserProfile>("/users/me/language", { language });

// Eventos
export function listEvents({
  q, city, category, featured, soldOut, page = 0, size = 12,
}: { q?: string; city?: string; category?: EventCategory; featured?: boolean; soldOut?: boolean; page?: number; size?: number }) {
  // URLSearchParams codifica os filtros digitados pelo usuário.
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (q) params.set("q", q.slice(0, 100));
  if (city) params.set("city", city.slice(0, 100));
  if (category) params.set("category", category);
  if (featured !== undefined) params.set("featured", String(featured));
  if (soldOut !== undefined) params.set("soldOut", String(soldOut));
  return api.get<Page<EventSummary>>(`/events?${params}`);
}
export const listEventCategories = () => api.get<EventCategoryCount[]>("/events/categories");
export const listMyEvents = (page = 0, size = 12) =>
  api.get<Page<EventSummary>>(`/events/mine?page=${page}&size=${size}`);
export const getEvent = (id: string) => api.get<EventDetails>(`/events/${seg(id)}`);
export const createEvent = (data: EventInput) => api.post<EventDetails>("/events", data);
export const updateEvent = (id: string, data: Partial<EventInput>) => api.put<EventDetails>(`/events/${seg(id)}`, data);
export const deleteEvent = (id: string) => api.delete<void>(`/events/${seg(id)}`);
export const cancelEvent = (id: string, reason: string) =>
  api.post<EventCancellationResult>(`/events/${seg(id)}/cancel`, { reason: reason.trim() || null });
// Só ADMIN.
export const setEventFeatured = (id: string, featured: boolean) =>
  api.patch<EventDetails>(`/events/${seg(id)}/featured`, { featured });

// Lotes
export const listTicketTypes = (eventId: string) =>
  api.get<TicketTypeSummary[]>(`/events/${seg(eventId)}/ticket-types`);
export const createTicketType = (eventId: string, data: TicketTypeInput) =>
  api.post<TicketTypeDetails>(`/events/${seg(eventId)}/ticket-types`, data);
// Dono do evento ou ADMIN: lotes com quantidades internas.
export const listManagedTicketTypes = (eventId: string) =>
  api.get<TicketTypeDetails[]>(`/events/${seg(eventId)}/ticket-types/manage`);
export const updateTicketType = (eventId: string, ticketTypeId: string, data: TicketTypeUpdate) =>
  api.patch<TicketTypeDetails>(`/events/${seg(eventId)}/ticket-types/${seg(ticketTypeId)}`, data);
export const deactivateTicketType = (eventId: string, ticketTypeId: string) =>
  api.post<TicketTypeDetails>(`/events/${seg(eventId)}/ticket-types/${seg(ticketTypeId)}/deactivate`);
export const reactivateTicketType = (eventId: string, ticketTypeId: string) =>
  api.post<TicketTypeDetails>(`/events/${seg(eventId)}/ticket-types/${seg(ticketTypeId)}/reactivate`);
export const listParticipants = (eventId: string, filters: ParticipantFilters) =>
  api.get<Page<Participant>>(`/events/${seg(eventId)}/participants${participantsQuery(filters)}`);
export const downloadParticipantsCsv = (eventId: string, filters: ParticipantFilters) =>
  apiDownload(`/events/${seg(eventId)}/participants.csv${participantsQuery({ ...filters, page: undefined, size: undefined })}`);

export const listCoupons = (eventId: string) => api.get<Coupon[]>(`/events/${seg(eventId)}/coupons`);
export const createCoupon = (eventId: string, data: CouponInput) => api.post<Coupon>(`/events/${seg(eventId)}/coupons`, data);
export const updateCoupon = (eventId: string, couponId: string, data: CouponSettings) =>
  api.put<Coupon>(`/events/${seg(eventId)}/coupons/${seg(couponId)}`, data);
export const deleteCoupon = (eventId: string, couponId: string) => api.delete<void>(`/events/${seg(eventId)}/coupons/${seg(couponId)}`);

// Dashboards do organizador
export const getEventDashboard = (eventId: string) => api.get<EventDashboard>(`/events/${seg(eventId)}/dashboard`);
export function listEventOrders(
  eventId: string,
  { status, q, page = 0, size = 20 }: { status?: OrderStatus; q?: string; page?: number; size?: number },
) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) params.set("status", status);
  if (q) params.set("q", q.slice(0, 100));
  return api.get<Page<EventOrderRow>>(`/events/${seg(eventId)}/orders?${params}`);
}
export const getOrganizerDashboard = (page = 0, size = 20) =>
  api.get<OrganizerDashboard>(`/organizer/dashboard?page=${page}&size=${size}`);

export const getBalance = () => api.get<Balance>("/organizer/balance");
export function listLedger({ eventId, page = 0, size = 20 }: { eventId?: string; page?: number; size?: number }) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (eventId) params.set("eventId", eventId);
  return api.get<Page<LedgerEntry>>(`/organizer/ledger?${params}`);
}

export async function getPayoutAccount(): Promise<PayoutAccount | null> {
  try {
    return await api.get<PayoutAccount>("/organizer/payout-account");
  } catch (error) {
    if (error instanceof ApiError && error.problemType === "payout-account-not-found") return null;
    throw error;
  }
}
export const savePayoutAccount = (data: PayoutAccountInput) => api.put<PayoutAccount>("/organizer/payout-account", data);
export const requestPayout = (amount: number, password: string, idempotencyKey: string) =>
  api.post<Payout>("/organizer/payouts", { amount, password }, { "Idempotency-Key": idempotencyKey });
export const listPayouts = (page = 0, size = 10) => api.get<Page<Payout>>(`/organizer/payouts?page=${page}&size=${size}`);
export const cancelPayout = (id: string) => api.post<Payout>(`/organizer/payouts/${seg(id)}/cancel`);
export function downloadLedgerCsv({ eventId }: { eventId?: string }) {
  const params = new URLSearchParams();
  if (eventId) params.set("eventId", eventId);
  const query = params.toString();
  return apiDownload(`/organizer/ledger.csv${query ? `?${query}` : ""}`);
}

export const listPayoutsForReview = (page = 0, size = 20) =>
  api.get<Page<AdminPayout>>(`/admin/payouts?status=UNDER_REVIEW&page=${page}&size=${size}`);
export const approvePayout = (id: string) => api.post<Payout>(`/admin/payouts/${seg(id)}/approve`);
export const rejectPayout = (id: string, reason: string) => api.post<Payout>(`/admin/payouts/${seg(id)}/reject`, { reason });
export const findUserByEmail = (email: string) =>
  api.get<AdminUser>(`/admin/users?${new URLSearchParams({ email: email.trim() })}`);
export const suspendUser = (userId: string, reason: string) =>
  api.post<AdminUser>(`/admin/users/${seg(userId)}/suspension`, { reason });
export const reactivateUser = (userId: string) => api.delete<AdminUser>(`/admin/users/${seg(userId)}/suspension`);
export const findOrganizerPayoutStatus = (email: string) =>
  api.get<OrganizerPayoutStatus>(`/admin/organizers?${new URLSearchParams({ email: email.trim() })}`);
export const blockOrganizerPayouts = (organizerId: string, reason: string) =>
  api.post<OrganizerPayoutStatus>(`/admin/organizers/${seg(organizerId)}/payout-block`, { reason });
export const unblockOrganizerPayouts = (organizerId: string) =>
  api.delete<OrganizerPayoutStatus>(`/admin/organizers/${seg(organizerId)}/payout-block`);
export function listAudit(filters: {
  targetType?: AuditTargetType;
  targetId?: string;
  actorId?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}) {
  const params = new URLSearchParams({ page: String(filters.page ?? 0), size: String(filters.size ?? 20) });
  if (filters.targetType) params.set("targetType", filters.targetType);
  if (filters.targetId) params.set("targetId", filters.targetId);
  if (filters.actorId) params.set("actorId", filters.actorId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return api.get<Page<AuditEntry>>(`/admin/audit?${params}`);
}

// Pedidos e pagamento
export const createOrder = (items: { ticketTypeId: string; quantity: number }[], idempotencyKey: string, couponCode?: string | null) =>
  api.post<OrderDetails>("/orders", couponCode ? { items, couponCode } : { items }, { "Idempotency-Key": idempotencyKey });
export const previewCoupon = (eventId: string, code: string, items: { ticketTypeId: string; quantity: number }[]) =>
  api.post<CouponPreview>(`/events/${seg(eventId)}/coupons/preview`, { code, items });
export const listMyOrders = (page = 0, size = 20) =>
  api.get<Page<OrderSummary>>(`/orders?page=${page}&size=${size}&sort=createdAt,desc`);
export const getOrder = (id: string) => api.get<OrderDetails>(`/orders/${seg(id)}`);
export const cancelOrder = (id: string) => api.delete<OrderDetails>(`/orders/${seg(id)}`);
export const refundOrder = (id: string) => api.post<OrderDetails>(`/orders/${seg(id)}/refund`);
export const payOrder = (id: string) => api.post<PaymentDetails>(`/orders/${seg(id)}/payment`);

// Ingressos
export const listMyTickets = (page = 0, size = 30) =>
  api.get<Page<TicketDetails>>(`/tickets/me?page=${page}&size=${size}&sort=createdAt,desc`);
export const checkIn = (code: string) => api.post<TicketDetails>(`/tickets/${seg(code)}/check-in`);
export const transferTicket = (id: string, recipientEmail: string, password: string) =>
  api.post<TicketTransferResult>(`/tickets/${seg(id)}/transfer`, { recipientEmail, password });
