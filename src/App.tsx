// Mapa de telas: cada <Route> liga um endereço a um componente.
// Rotas aninhadas herdam a moldura do pai (Layout, OrganizerLayout).
// Só a home, a página do evento, entrar e criar conta vão no pacote inicial;
// o resto vem sob demanda (pages/lazyPages.ts), com o Suspense do Layout.

import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";
import RequireAuth from "./auth/RequireAuth";
import Layout from "./components/Layout";
import EventDetailPage from "./pages/EventDetailPage";
import EventsPage from "./pages/EventsPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import RegisterPage from "./pages/RegisterPage";
import {
  AccountDeletedPage, AccountPage, AdminAuditPage, AdminLayout, AdminPayoutsPage, AdminUsersPage, CheckInPage, CheckoutPage,
  ForgotPasswordPage, GoogleCallbackPage, HelpPage, HowItWorksPage, LegalPage, OrderConfirmationPage, OrderDetailPage,
  OrdersPage, OrganizerDashboardPage, OrganizerEventFormPage, OrganizerEventManagePage, OrganizerEventsPage, OrganizerFinancePage,
  OrganizerLayout, PaymentPage, ResetPasswordPage, TicketsPage,
} from "./pages/lazyPages";

// Envolve a tela na guarda de login.
const privateRoute = (element: ReactNode) => <RequireAuth>{element}</RequireAuth>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Público */}
        <Route index element={<EventsPage />} />
        <Route path="events/:id" element={<EventDetailPage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="terms" element={<LegalPage document="terms" />} />
        <Route path="privacy" element={<LegalPage document="privacy" />} />
        <Route path="account-deleted" element={<AccountDeletedPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="auth/google/callback" element={<GoogleCallbackPage />} />

        {/* Compra */}
        <Route path="checkout" element={privateRoute(<CheckoutPage />)} />
        <Route path="orders/:id/payment" element={privateRoute(<PaymentPage />)} />
        <Route path="orders/:id/confirmation" element={privateRoute(<OrderConfirmationPage />)} />

        {/* Comprador */}
        <Route path="orders" element={privateRoute(<OrdersPage />)} />
        <Route path="orders/:id" element={privateRoute(<OrderDetailPage />)} />
        <Route path="tickets" element={privateRoute(<TicketsPage />)} />
        <Route path="account" element={privateRoute(<AccountPage />)} />

        {/* Organizador */}
        <Route path="organizer" element={privateRoute(<OrganizerLayout />)}>
          <Route index element={<OrganizerDashboardPage />} />
          <Route path="events" element={<OrganizerEventsPage />} />
          <Route path="events/new" element={<OrganizerEventFormPage />} />
          <Route path="events/:id" element={<OrganizerEventManagePage />} />
          <Route path="events/:id/edit" element={<OrganizerEventFormPage />} />
          <Route path="check-in" element={<CheckInPage />} />
          <Route path="finance" element={<OrganizerFinancePage />} />
        </Route>

        <Route path="admin" element={privateRoute(<AdminLayout />)}>
          <Route index element={<AdminPayoutsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="organizers" element={<Navigate to="/admin/users" replace />} />
          <Route path="audit" element={<AdminAuditPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
