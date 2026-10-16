// Telas carregadas sob demanda: cada import() vira um arquivo JS separado no
// build, baixado só quando a rota abre. No pacote inicial ficam a home, a
// página do evento, entrar e criar conta (veja App.tsx), mais a tela de "não
// encontrado", que a página do evento já usa.
//
// Se um desses arquivos sumir depois de um deploy, o import() falha, o
// ErrorBoundary da tela reconhece a falha de pedaço e recarrega a página uma vez.

import { lazy } from "react";

const loadCheckout = () => import("./CheckoutPage");
const loadPayment = () => import("./PaymentPage");

// Baixa a tela antes do clique (o navegador guarda o módulo; o import() da
// rota reaproveita o mesmo download). Falha aqui é ignorada: a rota tenta de novo.
const preload = (load: () => Promise<unknown>) => () => {
  load().catch(() => {});
};
export const preloadCheckout = preload(loadCheckout);
export const preloadPayment = preload(loadPayment);

// Público, fora do caminho principal
export const HowItWorksPage = lazy(() => import("./HowItWorksPage"));
export const HelpPage = lazy(() => import("./HelpPage"));
export const LegalPage = lazy(() => import("./LegalPage"));
export const AccountDeletedPage = lazy(() => import("./AccountDeletedPage"));
export const ForgotPasswordPage = lazy(() => import("./ForgotPasswordPage"));
export const ResetPasswordPage = lazy(() => import("./ResetPasswordPage"));
export const GoogleCallbackPage = lazy(() => import("./GoogleCallbackPage"));

// Compra
export const CheckoutPage = lazy(loadCheckout);
export const PaymentPage = lazy(loadPayment);
export const OrderConfirmationPage = lazy(() => import("./OrderConfirmationPage"));

// Comprador
export const OrdersPage = lazy(() => import("./OrdersPage"));
export const OrderDetailPage = lazy(() => import("./OrderDetailPage"));
export const TicketsPage = lazy(() => import("./TicketsPage"));
export const AccountPage = lazy(() => import("./AccountPage"));

// Organizador
export const OrganizerLayout = lazy(() => import("../components/OrganizerLayout"));
export const OrganizerDashboardPage = lazy(() => import("./organizer/OrganizerDashboardPage"));
export const OrganizerEventsPage = lazy(() => import("./organizer/OrganizerEventsPage"));
export const OrganizerEventFormPage = lazy(() => import("./organizer/OrganizerEventFormPage"));
export const OrganizerEventManagePage = lazy(() => import("./organizer/OrganizerEventManagePage"));
export const CheckInPage = lazy(() => import("./organizer/CheckInPage"));
export const OrganizerFinancePage = lazy(() => import("./organizer/OrganizerFinancePage"));

// Administração
export const AdminLayout = lazy(() => import("../components/AdminLayout"));
export const AdminPayoutsPage = lazy(() => import("./admin/AdminPayoutsPage"));
export const AdminUsersPage = lazy(() => import("./admin/AdminUsersPage"));
export const AdminAuditPage = lazy(() => import("./admin/AdminAuditPage"));
