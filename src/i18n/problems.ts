import { getLocale, type Locale } from "./locale";

export interface ProblemContext {
  status: number;
  retryAfter: number | null;
  detail: string | null;
  properties: Record<string, unknown>;
}

type Message = string | ((context: ProblemContext, locale: Locale) => string);

export type ProblemScope = "checkout-coupon" | "coupon-management" | "transfer" | "check-in" | "login" | "password-change" | "lot";

export type ClientMessageKey = "network" | "timeout" | "invalidRoute" | "unexpected";

export interface Catalog {
  problems: Record<string, Message>;
  reasons: Record<string, Record<string, Message>>;
  scopes: Record<ProblemScope, Record<string, Message>>;
  generic: {
    byStatus: (status: number) => string;
    errorCode: (message: string, requestId: string) => string;
    network: string;
    timeout: string;
    invalidRoute: string;
    unexpected: string;
  };
}

const minutes = (seconds: number | null) => Math.max(1, Math.ceil((seconds ?? 60) / 60));

const money = (value: unknown, locale: Locale) => {
  const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(amount) ? new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(amount) : null;
};

const dateTime = (value: unknown, locale: Locale) => {
  const date = typeof value === "string" ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(date)
    : null;
};

const count = (value: unknown) => (Array.isArray(value) ? value.length : typeof value === "number" ? value : null);

const PT_BR: Catalog = {
  problems: {
    "email-already-exists": "Já existe uma conta com este e-mail.",
    "validation-failed": "Alguns dados enviados são inválidos. Confira o formulário e tente de novo.",
    "malformed-request-body": "Não foi possível ler os dados enviados. Recarregue a página e tente de novo.",
    "missing-parameter": "Faltou uma informação no pedido. Recarregue a página e tente de novo.",
    "missing-header": "Faltou uma informação no pedido. Recarregue a página e tente de novo.",
    "bad-request": "O pedido não pôde ser processado. Recarregue a página e tente de novo.",
    "unsupported-media-type": "O formato dos dados enviados não é aceito. Recarregue a página e tente de novo.",
    "invalid-credentials": "E-mail ou senha incorretos.",
    "authentication-required": "Faça login para continuar.",
    "session-expired": "Sua sessão expirou. Entre de novo para continuar.",
    "auth-request-rejected": "Não foi possível concluir a ação a partir desta página. Recarregue e tente de novo.",
    "access-denied": "Você não tem permissão para esta ação.",
    "too-many-login-attempts": ({ retryAfter }) => `Muitas tentativas de login. Tente de novo em ${minutes(retryAfter)} min.`,
    "internal-error": "Tivemos um problema do nosso lado. Tente de novo em instantes.",
    "invalid-role-change": "Esta conta já é de organizador.",
    "user-not-found": "Usuário não encontrado.",
    "event-not-found": "Evento não encontrado.",
    "event-access-denied": "Você não organiza este evento.",
    "invalid-event-dates": "Confira as datas: o fim do evento precisa ser depois do início.",
    "invalid-parameter": "Algum filtro ou valor informado é inválido.",
    "ticket-type-not-found": "Este lote não está mais à venda.",
    "invalid-ticket-type-quantity": "A quantidade do lote não pode ficar abaixo do que já foi vendido ou reservado.",
    "invalid-ticket-type-state": "A situação do lote mudou. Atualize a página.",
    "ticket-type-name-already-exists": "Já existe um lote com esse nome neste evento.",
    "invalid-order-state": "Este pedido não permite mais esta ação. Atualize a página para ver a situação atual.",
    "insufficient-stock": "Não há mais ingressos suficientes neste lote.",
    "mixed-events-order": "Um pedido só pode ter ingressos de um mesmo evento.",
    "max-per-order-exceeded": "A quantidade passa do limite de ingressos por pedido deste lote.",
    "max-per-buyer-exceeded": ({ properties }) => {
      const limit = count(properties.maxPerBuyer);
      const remaining = count(properties.remaining);
      if (limit === null) return "Você chegou ao limite de ingressos deste lote por pessoa.";
      const base = `Cada pessoa pode comprar no máximo ${limit} ${limit === 1 ? "ingresso" : "ingressos"} deste lote`;
      if (remaining === null) return `${base}.`;
      return remaining === 0
        ? `${base}, e você já chegou a esse limite.`
        : `${base}. Você ainda pode comprar ${remaining}.`;
    },
    "order-not-found": "Pedido não encontrado.",
    "order-has-transferred-tickets": "Este pedido não pode ser reembolsado porque algum ingresso dele já foi transferido.",
    "invalid-payment-state": "Este pedido já foi pago.",
    "invalid-ticket-state": "Este ingresso não está válido para esta ação.",
    "ticket-not-found": "Ingresso não encontrado.",
    "ticket-transfer-closed": "O evento já começou. Este ingresso não pode mais ser transferido.",
    "ticket-transfer-limit-reached": "Este ingresso já atingiu o limite de transferências.",
    "self-transfer": "Informe o e-mail de outra pessoa.",
    "transfer-recipient-unavailable": "Não foi possível transferir para este e-mail. Confira se a pessoa já tem conta no Ticketfy.",
    "too-many-transfer-attempts": ({ retryAfter }) => `Muitas tentativas de transferência. Tente de novo em ${minutes(retryAfter)} min.`,
    "resource-not-found": "Não encontramos o que você procurou.",
    "method-not-allowed": "Esta ação não está disponível.",
    "invalid-event-state": "O evento foi cancelado ou já terminou.",
    "event-has-sales": "Este evento já tem ingressos vendidos ou reservados e não pode ser excluído. Você pode cancelá-lo.",
    "sales-closed": "As vendas deste evento foram encerradas.",
    "invalid-password": "Senha incorreta.",
    "too-many-password-attempts": ({ retryAfter }) => `Muitas tentativas com a senha. Tente de novo em ${minutes(retryAfter)} min.`,
    "payout-account-not-found": "Você ainda não cadastrou os dados de recebimento.",
    "payout-account-required": "Cadastre os dados de recebimento antes de pedir um saque.",
    "payout-account-cooldown": ({ properties }, locale) => {
      const until = dateTime(properties.blockedUntil, locale);
      return until
        ? `Por segurança, depois de trocar a chave Pix os saques ficam bloqueados até ${until}.`
        : "Por segurança, os saques ficam bloqueados por um tempo depois de trocar a chave Pix.";
    },
    "pix-key-not-found": "Não encontramos esta chave Pix. Confira o tipo e o valor da chave.",
    "pix-key-holder-mismatch": "A chave Pix não pertence ao documento informado.",
    "payout-in-progress": "Você já tem um saque em andamento. Aguarde a conclusão para pedir outro.",
    "negative-available-balance": ({ properties }, locale) => {
      const available = money(properties.available, locale);
      return available
        ? `Seu saldo disponível está negativo (${available}), então não é possível sacar agora.`
        : "Seu saldo disponível está negativo, então não é possível sacar agora.";
    },
    "payout-below-minimum": ({ properties }, locale) => {
      const minimum = money(properties.minAmount, locale);
      return minimum ? `O valor mínimo de saque é ${minimum}.` : "O valor está abaixo do mínimo de saque.";
    },
    "payout-exceeds-available": ({ properties }, locale) => {
      const available = money(properties.available, locale);
      return available ? `O valor passa do seu saldo disponível (${available}).` : "O valor passa do seu saldo disponível.";
    },
    "payout-not-found": "Saque não encontrado.",
    "invalid-payout-state": "Este saque não permite mais esta ação. Atualize a página para ver a situação atual.",
    "payouts-blocked": "Os saques desta conta estão bloqueados. Fale com o suporte para saber mais.",
    "invalid-payout-block-state": "A situação do bloqueio de saques mudou. Atualize a página.",
    "organizer-not-found": "Organizador não encontrado.",
    "coupon-not-found": "Este cupom não existe mais.",
    "coupon-code-already-exists": "Já existe um cupom com esse código neste evento.",
    "coupon-already-used": "Este cupom já foi usado: tipo e valor não podem mudar e ele não pode ser excluído, só desativado.",
    "invalid-coupon-settings": "Confira as configurações do cupom.",
    "invalid-coupon": "Cupom inválido ou indisponível para este pedido.",
    "coupon-buyer-limit-reached": ({ properties }) => {
      const limit = count(properties.maxUsesPerBuyer);
      return limit === null
        ? "Você já usou este cupom o máximo de vezes permitido."
        : `Você já usou este cupom ${limit === 1 ? "1 vez" : `${limit} vezes`}, o máximo permitido por pessoa.`;
    },
    "too-many-coupon-attempts": ({ retryAfter }) => `Muitas tentativas com cupom. Tente de novo em ${minutes(retryAfter)} min.`,
    "email-not-allowed": "Este e-mail não pode ser usado. Informe outro.",
    "too-many-data-exports": ({ retryAfter }) => `Você atingiu o limite de exportações. Tente de novo em ${minutes(retryAfter)} min.`,
    "admin-account-deletion": "Contas de administrador não podem ser excluídas.",
    "account-suspended": "Sua conta está suspensa. Fale com o suporte para saber mais.",
    "admin-account-suspension": "Contas de administrador não podem ser suspensas.",
    "invalid-suspension-state": "A situação da conta mudou. Atualize a página.",
    "account-has-payout-block": "Os saques desta conta estão bloqueados. Fale com o suporte para excluí-la.",
    "account-has-payout-in-progress": "Aguarde o saque em andamento terminar, ou cancele-o, antes de excluir a conta.",
    "account-has-balance": ({ properties }, locale) => {
      const parts = [
        ["a liberar", money(properties.pending, locale)],
        ["disponível", money(properties.available, locale)],
        ["retido", money(properties.held, locale)],
      ]
        .filter(([, value]) => value !== null)
        .map(([label, value]) => `${label} ${value}`);
      return parts.length > 0
        ? `O saldo precisa estar zerado para excluir a conta (${parts.join(", ")}).`
        : "O saldo precisa estar zerado para excluir a conta.";
    },
    "account-has-active-events": ({ properties }) => {
      const events = count(properties.eventIds);
      return events
        ? `Cancele ou espere terminar ${events === 1 ? "o evento com vendas" : `os ${events} eventos com vendas`} antes de excluir a conta.`
        : "Cancele ou espere terminar os eventos com vendas antes de excluir a conta.";
    },
    "account-has-upcoming-tickets": ({ properties }) => {
      const tickets = count(properties.ticketCount);
      return tickets
        ? `Você tem ${tickets === 1 ? "1 ingresso válido" : `${tickets} ingressos válidos`} para eventos futuros. Transfira ou peça o reembolso antes de excluir a conta.`
        : "Você tem ingressos válidos para eventos futuros. Transfira ou peça o reembolso antes de excluir a conta.";
    },
    "google-login-unavailable": "O login com Google está indisponível no momento. Entre com e-mail e senha.",
    "google-redirect-uri-not-allowed": "O login com Google não está liberado para este endereço do site. Entre com e-mail e senha.",
    "google-authorization-failed": "O Google não confirmou o seu login. Tente de novo.",
    "google-email-not-verified": "O e-mail da sua conta Google ainda não foi verificado. Verifique-o no Google e tente de novo.",
    "google-account-conflict": "Este e-mail já está ligado a outra conta Google. Entre com a conta Google certa ou com e-mail e senha.",
    "google-unavailable": "O Google não respondeu. Tente de novo em instantes.",
    "password-not-set": "Sua conta ainda não tem senha. Defina uma senha na sua conta para confirmar esta ação.",
    "email-confirmation-mismatch": "O e-mail não confere com o da sua conta.",
  },
  reasons: {
    "invalid-coupon-settings": {
      "percent-out-of-range": "O percentual precisa estar entre 0,01 e 100.",
      "ends-before-starts": "O fim da validade precisa ser depois do início.",
      "max-uses-below-used": ({ properties }) => {
        const used = count(properties.usesCount);
        return used === null
          ? "O limite de usos não pode ficar abaixo dos usos já feitos."
          : `O limite de usos não pode ficar abaixo dos ${used} ${used === 1 ? "uso já feito" : "usos já feitos"}.`;
      },
    },
    "coupon-already-used": {
      "discount-locked": "Este cupom já foi usado: o tipo e o valor do desconto não podem mais mudar.",
      "delete-blocked": "Este cupom já foi usado e não pode ser excluído. Você pode desativá-lo.",
    },
    "invalid-ticket-type-quantity": {
      "below-sold": ({ properties }) => {
        const sold = count(properties.quantitySold);
        return sold === null
          ? "A quantidade do lote não pode ficar abaixo do que já foi vendido ou reservado."
          : `A quantidade do lote não pode ficar abaixo dos ${sold} ingressos já vendidos ou reservados.`;
      },
    },
    "invalid-ticket-type-state": {
      "already-active": "Este lote já está ativo.",
      "already-inactive": "Este lote já está desativado.",
    },
    "invalid-event-state": {
      cancelled: "Este evento foi cancelado.",
      ended: "Este evento já terminou.",
    },
    "invalid-order-state": {
      expired: "A reserva deste pedido expirou. Os ingressos voltaram à venda.",
      "refund-period-ended": "O prazo de reembolso deste evento já terminou.",
      "tickets-used": "Este pedido tem ingressos já utilizados e não pode ser reembolsado.",
      "not-pending": "Este pedido não está mais aguardando pagamento.",
      "not-paid": "Só pedidos pagos podem ser reembolsados.",
    },
    "invalid-payment-state": {
      "already-paid": "Este pedido já foi pago.",
      "not-pending": "Este pagamento não está mais pendente.",
      "not-approved": "Este pagamento não foi aprovado, então não pode ser estornado.",
    },
    "invalid-ticket-state": {
      "event-cancelled": "O evento deste ingresso foi cancelado.",
      "not-valid": "Este ingresso já foi utilizado ou cancelado.",
      "already-used": ({ properties }, locale) => {
        const at = dateTime(properties.usedAt, locale);
        return at ? `Este ingresso já foi utilizado em ${at}.` : "Este ingresso já foi utilizado.";
      },
      "transfer-unavailable": "Este ingresso mudou enquanto a transferência era feita. Atualize a página.",
    },
    "invalid-suspension-state": {
      "already-suspended": "Esta conta já está suspensa.",
      "not-suspended": "Esta conta não está suspensa.",
    },
    "invalid-payout-state": {
      "already-processing": "Este saque já entrou em processamento e não pode mais ser cancelado.",
      "not-cancellable": "Este saque não pode mais ser cancelado.",
      "not-under-review": "Este saque não está mais em análise.",
      "changed-concurrently": "Este saque foi alterado por outra ação. Atualize a página.",
    },
    "invalid-payout-block-state": {
      "already-blocked": "Os saques deste organizador já estão bloqueados.",
      "not-blocked": "Os saques deste organizador não estão bloqueados.",
    },
  },
  scopes: {
    "checkout-coupon": {
      "ticket-type-not-found": "Algum ingresso do pedido não está mais à venda.",
      "validation-failed": "Confira o código do cupom.",
    },
    "coupon-management": {
      "invalid-event-state": "O evento foi cancelado e os cupons não podem mais ser alterados.",
      "validation-failed": "Confira os campos do cupom.",
    },
    transfer: {
      "invalid-ticket-state": "Este ingresso não pode mais ser transferido.",
      "invalid-event-state": "Este ingresso não pode mais ser transferido.",
      "ticket-not-found": "Este ingresso não pode mais ser transferido.",
    },
    "check-in": {
      "invalid-ticket-state": ({ properties }, locale) => {
        if (properties.reason === "event-cancelled") return "O evento deste ingresso foi cancelado.";
        if (properties.reason !== "already-used") return "Ingresso já utilizado ou cancelado.";
        const at = dateTime(properties.usedAt, locale);
        return at ? `Este ingresso já entrou em ${at}. Não libere de novo.` : "Este ingresso já entrou. Não libere de novo.";
      },
      "ticket-not-found": "Código não encontrado.",
      "event-access-denied": "Este ingresso é de um evento de outro organizador.",
    },
    login: {
      "validation-failed": "E-mail ou senha incorretos.",
      "auth-request-rejected": "Não foi possível entrar a partir desta página. Recarregue e tente de novo.",
    },
    "password-change": {
      "invalid-password": "Senha atual incorreta.",
    },
    lot: {
      "invalid-ticket-type-quantity": ({ properties }) => {
        const sold = count(properties.quantitySold);
        return sold === null ? "Abaixo do que já foi vendido ou reservado." : `Abaixo dos ${sold} já vendidos ou reservados.`;
      },
    },
  },
  generic: {
    byStatus: (status) => {
      if (status === 400) return "Dados inválidos. Confira os campos.";
      if (status === 401) return "Faça login para continuar.";
      if (status === 403) return "Você não tem permissão para esta ação.";
      if (status === 404) return "Não encontrado.";
      if (status === 409) return "Essa ação conflita com o estado atual. Atualize a página.";
      if (status === 429) return "Muitas tentativas. Aguarde um pouco e tente de novo.";
      if (status >= 500) return "A API teve um problema interno. Tente de novo em instantes.";
      return `Não foi possível concluir a ação (erro ${status}).`;
    },
    errorCode: (message, requestId) => `${message} Código do erro: ${requestId}`,
    network: "Não foi possível conectar à API. Ela está no ar?",
    timeout: "A API demorou demais para responder. Tente de novo.",
    invalidRoute: "Rota inválida.",
    unexpected: "Algo deu errado. Tente de novo.",
  },
};

const EN: Catalog = {
  problems: {
    "email-already-exists": "An account with this email already exists.",
    "validation-failed": "Some of the information you sent is invalid. Check the form and try again.",
    "malformed-request-body": "We couldn't read the information you sent. Reload the page and try again.",
    "missing-parameter": "Some information was missing from the request. Reload the page and try again.",
    "missing-header": "Some information was missing from the request. Reload the page and try again.",
    "bad-request": "The request couldn't be processed. Reload the page and try again.",
    "unsupported-media-type": "The format of the data you sent isn't accepted. Reload the page and try again.",
    "invalid-credentials": "Incorrect email or password.",
    "authentication-required": "Sign in to continue.",
    "session-expired": "Your session has expired. Sign in again to continue.",
    "auth-request-rejected": "This action couldn't be completed from this page. Reload and try again.",
    "access-denied": "You don't have permission to do this.",
    "too-many-login-attempts": ({ retryAfter }) => `Too many sign-in attempts. Try again in ${minutes(retryAfter)} min.`,
    "internal-error": "Something went wrong on our side. Try again in a moment.",
    "invalid-role-change": "This account is already an organizer account.",
    "user-not-found": "User not found.",
    "event-not-found": "Event not found.",
    "event-access-denied": "You don't organize this event.",
    "invalid-event-dates": "Check the dates: the event must end after it starts.",
    "invalid-parameter": "One of the filters or values is invalid.",
    "ticket-type-not-found": "This ticket batch is no longer on sale.",
    "invalid-ticket-type-quantity": "The batch quantity can't be lower than what has already been sold or reserved.",
    "invalid-ticket-type-state": "The status of this batch has changed. Refresh the page.",
    "ticket-type-name-already-exists": "This event already has a batch with that name.",
    "invalid-order-state": "This order no longer allows this action. Refresh the page to see its current status.",
    "insufficient-stock": "There aren't enough tickets left in this batch.",
    "mixed-events-order": "An order can only have tickets for a single event.",
    "max-per-order-exceeded": "The quantity is over this batch's per-order limit.",
    "max-per-buyer-exceeded": ({ properties }) => {
      const limit = count(properties.maxPerBuyer);
      const remaining = count(properties.remaining);
      if (limit === null) return "You've reached this batch's per-person limit.";
      const base = `Each person can buy up to ${limit} ${limit === 1 ? "ticket" : "tickets"} from this batch`;
      if (remaining === null) return `${base}.`;
      return remaining === 0 ? `${base}, and you've already reached that limit.` : `${base}. You can still buy ${remaining}.`;
    },
    "order-not-found": "Order not found.",
    "order-has-transferred-tickets": "This order can't be refunded because one of its tickets has been transferred.",
    "invalid-payment-state": "This order has already been paid.",
    "invalid-ticket-state": "This ticket isn't valid for this action.",
    "ticket-not-found": "Ticket not found.",
    "ticket-transfer-closed": "The event has already started. This ticket can no longer be transferred.",
    "ticket-transfer-limit-reached": "This ticket has reached its transfer limit.",
    "self-transfer": "Enter someone else's email.",
    "transfer-recipient-unavailable": "We couldn't transfer to this email. Check that the person already has a Ticketfy account.",
    "too-many-transfer-attempts": ({ retryAfter }) => `Too many transfer attempts. Try again in ${minutes(retryAfter)} min.`,
    "resource-not-found": "We couldn't find what you were looking for.",
    "method-not-allowed": "This action isn't available.",
    "invalid-event-state": "The event was cancelled or has already ended.",
    "event-has-sales": "This event already has sold or reserved tickets and can't be deleted. You can cancel it instead.",
    "sales-closed": "Ticket sales for this event have ended.",
    "invalid-password": "Incorrect password.",
    "too-many-password-attempts": ({ retryAfter }) => `Too many password attempts. Try again in ${minutes(retryAfter)} min.`,
    "payout-account-not-found": "You haven't added your payout details yet.",
    "payout-account-required": "Add your payout details before requesting a withdrawal.",
    "payout-account-cooldown": ({ properties }, locale) => {
      const until = dateTime(properties.blockedUntil, locale);
      return until
        ? `For your security, withdrawals are blocked until ${until} after a Pix key change.`
        : "For your security, withdrawals are blocked for a while after a Pix key change.";
    },
    "pix-key-not-found": "We couldn't find this Pix key. Check the key type and value.",
    "pix-key-holder-mismatch": "The Pix key doesn't belong to the document you entered.",
    "payout-in-progress": "You already have a withdrawal in progress. Wait for it to finish before requesting another.",
    "negative-available-balance": ({ properties }, locale) => {
      const available = money(properties.available, locale);
      return available
        ? `Your available balance is negative (${available}), so you can't withdraw right now.`
        : "Your available balance is negative, so you can't withdraw right now.";
    },
    "payout-below-minimum": ({ properties }, locale) => {
      const minimum = money(properties.minAmount, locale);
      return minimum ? `The minimum withdrawal is ${minimum}.` : "The amount is below the minimum withdrawal.";
    },
    "payout-exceeds-available": ({ properties }, locale) => {
      const available = money(properties.available, locale);
      return available ? `The amount is over your available balance (${available}).` : "The amount is over your available balance.";
    },
    "payout-not-found": "Withdrawal not found.",
    "invalid-payout-state": "This withdrawal no longer allows this action. Refresh the page to see its current status.",
    "payouts-blocked": "Withdrawals for this account are blocked. Contact support to learn more.",
    "invalid-payout-block-state": "The withdrawal block status has changed. Refresh the page.",
    "organizer-not-found": "Organizer not found.",
    "coupon-not-found": "This coupon no longer exists.",
    "coupon-code-already-exists": "This event already has a coupon with that code.",
    "coupon-already-used": "This coupon has been used: its type and value can't change, and it can only be deactivated, not deleted.",
    "invalid-coupon-settings": "Check the coupon settings.",
    "invalid-coupon": "Invalid coupon, or not available for this order.",
    "coupon-buyer-limit-reached": ({ properties }) => {
      const limit = count(properties.maxUsesPerBuyer);
      return limit === null
        ? "You've already used this coupon the maximum number of times."
        : `You've already used this coupon ${limit === 1 ? "once" : `${limit} times`}, the maximum per person.`;
    },
    "too-many-coupon-attempts": ({ retryAfter }) => `Too many coupon attempts. Try again in ${minutes(retryAfter)} min.`,
    "email-not-allowed": "This email can't be used. Enter a different one.",
    "too-many-data-exports": ({ retryAfter }) => `You've reached the export limit. Try again in ${minutes(retryAfter)} min.`,
    "admin-account-deletion": "Administrator accounts can't be deleted.",
    "account-suspended": "Your account is suspended. Contact support to learn more.",
    "admin-account-suspension": "Administrator accounts can't be suspended.",
    "invalid-suspension-state": "The account status has changed. Refresh the page.",
    "account-has-payout-block": "Withdrawals for this account are blocked. Contact support to delete it.",
    "account-has-payout-in-progress": "Wait for the withdrawal in progress to finish, or cancel it, before deleting your account.",
    "account-has-balance": ({ properties }, locale) => {
      const parts = [
        ["pending", money(properties.pending, locale)],
        ["available", money(properties.available, locale)],
        ["held", money(properties.held, locale)],
      ]
        .filter(([, value]) => value !== null)
        .map(([label, value]) => `${label} ${value}`);
      return parts.length > 0
        ? `Your balance must be zero to delete your account (${parts.join(", ")}).`
        : "Your balance must be zero to delete your account.";
    },
    "account-has-active-events": ({ properties }) => {
      const events = count(properties.eventIds);
      return events
        ? `Cancel ${events === 1 ? "the event with sales" : `the ${events} events with sales`}, or wait for ${events === 1 ? "it" : "them"} to end, before deleting your account.`
        : "Cancel the events with sales, or wait for them to end, before deleting your account.";
    },
    "account-has-upcoming-tickets": ({ properties }) => {
      const tickets = count(properties.ticketCount);
      return tickets
        ? `You have ${tickets === 1 ? "1 valid ticket" : `${tickets} valid tickets`} for upcoming events. Transfer or refund them before deleting your account.`
        : "You have valid tickets for upcoming events. Transfer or refund them before deleting your account.";
    },
    "google-login-unavailable": "Google sign-in isn't available right now. Sign in with your email and password.",
    "google-redirect-uri-not-allowed": "Google sign-in isn't enabled for this site address. Sign in with your email and password.",
    "google-authorization-failed": "Google didn't confirm your sign-in. Try again.",
    "google-email-not-verified": "Your Google account email isn't verified yet. Verify it with Google and try again.",
    "google-account-conflict": "This email is already linked to another Google account. Sign in with the right Google account or with your email and password.",
    "google-unavailable": "Google didn't respond. Try again in a moment.",
    "password-not-set": "Your account doesn't have a password yet. Set one in your account to confirm this action.",
    "email-confirmation-mismatch": "The email doesn't match your account's.",
  },
  reasons: {
    "invalid-coupon-settings": {
      "percent-out-of-range": "The percentage must be between 0.01 and 100.",
      "ends-before-starts": "The end of the validity period must be after its start.",
      "max-uses-below-used": ({ properties }) => {
        const used = count(properties.usesCount);
        return used === null
          ? "The usage limit can't be lower than the uses already made."
          : `The usage limit can't be lower than the ${used} ${used === 1 ? "use" : "uses"} already made.`;
      },
    },
    "coupon-already-used": {
      "discount-locked": "This coupon has been used: its discount type and value can no longer change.",
      "delete-blocked": "This coupon has been used and can't be deleted. You can deactivate it instead.",
    },
    "invalid-ticket-type-quantity": {
      "below-sold": ({ properties }) => {
        const sold = count(properties.quantitySold);
        return sold === null
          ? "The batch quantity can't be lower than what has already been sold or reserved."
          : `The batch quantity can't be lower than the ${sold} tickets already sold or reserved.`;
      },
    },
    "invalid-ticket-type-state": {
      "already-active": "This batch is already active.",
      "already-inactive": "This batch is already deactivated.",
    },
    "invalid-event-state": {
      cancelled: "This event was cancelled.",
      ended: "This event has already ended.",
    },
    "invalid-order-state": {
      expired: "This order's reservation has expired. The tickets are back on sale.",
      "refund-period-ended": "The refund period for this event has ended.",
      "tickets-used": "This order has tickets that were already used, so it can't be refunded.",
      "not-pending": "This order is no longer awaiting payment.",
      "not-paid": "Only paid orders can be refunded.",
    },
    "invalid-payment-state": {
      "already-paid": "This order has already been paid.",
      "not-pending": "This payment is no longer pending.",
      "not-approved": "This payment wasn't approved, so it can't be refunded.",
    },
    "invalid-ticket-state": {
      "event-cancelled": "The event for this ticket was cancelled.",
      "not-valid": "This ticket has already been used or cancelled.",
      "already-used": ({ properties }, locale) => {
        const at = dateTime(properties.usedAt, locale);
        return at ? `This ticket was already used on ${at}.` : "This ticket has already been used.";
      },
      "transfer-unavailable": "This ticket changed while it was being transferred. Refresh the page.",
    },
    "invalid-suspension-state": {
      "already-suspended": "This account is already suspended.",
      "not-suspended": "This account isn't suspended.",
    },
    "invalid-payout-state": {
      "already-processing": "This withdrawal is already being processed and can no longer be cancelled.",
      "not-cancellable": "This withdrawal can no longer be cancelled.",
      "not-under-review": "This withdrawal is no longer under review.",
      "changed-concurrently": "This withdrawal was changed by another action. Refresh the page.",
    },
    "invalid-payout-block-state": {
      "already-blocked": "Withdrawals for this organizer are already blocked.",
      "not-blocked": "Withdrawals for this organizer aren't blocked.",
    },
  },
  scopes: {
    "checkout-coupon": {
      "ticket-type-not-found": "One of the tickets in your order is no longer on sale.",
      "validation-failed": "Check the coupon code.",
    },
    "coupon-management": {
      "invalid-event-state": "The event was cancelled, so its coupons can no longer change.",
      "validation-failed": "Check the coupon fields.",
    },
    transfer: {
      "invalid-ticket-state": "This ticket can no longer be transferred.",
      "invalid-event-state": "This ticket can no longer be transferred.",
      "ticket-not-found": "This ticket can no longer be transferred.",
    },
    "check-in": {
      "invalid-ticket-state": ({ properties }, locale) => {
        if (properties.reason === "event-cancelled") return "The event for this ticket was cancelled.";
        if (properties.reason !== "already-used") return "Ticket already used or cancelled.";
        const at = dateTime(properties.usedAt, locale);
        return at ? `This ticket already got in on ${at}. Don't let it in again.` : "This ticket already got in. Don't let it in again.";
      },
      "ticket-not-found": "Code not found.",
      "event-access-denied": "This ticket belongs to another organizer's event.",
    },
    login: {
      "validation-failed": "Incorrect email or password.",
      "auth-request-rejected": "We couldn't sign you in from this page. Reload and try again.",
    },
    "password-change": {
      "invalid-password": "Current password is incorrect.",
    },
    lot: {
      "invalid-ticket-type-quantity": ({ properties }) => {
        const sold = count(properties.quantitySold);
        return sold === null ? "Below what has already been sold or reserved." : `Below the ${sold} already sold or reserved.`;
      },
    },
  },
  generic: {
    byStatus: (status) => {
      if (status === 400) return "Invalid data. Check the fields.";
      if (status === 401) return "Sign in to continue.";
      if (status === 403) return "You don't have permission to do this.";
      if (status === 404) return "Not found.";
      if (status === 409) return "This action conflicts with the current state. Refresh the page.";
      if (status === 429) return "Too many attempts. Wait a little and try again.";
      if (status >= 500) return "The API had an internal problem. Try again in a moment.";
      return `The action couldn't be completed (error ${status}).`;
    },
    errorCode: (message, requestId) => `${message} Error code: ${requestId}`,
    network: "Couldn't connect to the API. Is it up?",
    timeout: "The API took too long to respond. Try again.",
    invalidRoute: "Invalid route.",
    unexpected: "Something went wrong. Try again.",
  },
};

export const CATALOGS: Record<Locale, Catalog> = { "pt-BR": PT_BR, en: EN };

const resolve = (message: Message, context: ProblemContext, locale: Locale) =>
  typeof message === "function" ? message(context, locale) : message;

export function problemMessage(
  slug: string | null,
  context: ProblemContext,
  scope?: ProblemScope,
  locale: Locale = getLocale(),
): string | null {
  if (!slug) return null;
  const catalog = CATALOGS[locale];
  const reason = typeof context.properties.reason === "string" ? context.properties.reason : null;
  const message =
    (scope ? catalog.scopes[scope][slug] : undefined) ??
    (reason ? catalog.reasons[slug]?.[reason] : undefined) ??
    catalog.problems[slug];
  return message === undefined ? null : resolve(message, context, locale);
}

export function problemText(slug: string, locale: Locale = getLocale()): string | null {
  return problemMessage(slug, { status: 0, retryAfter: null, detail: null, properties: {} }, undefined, locale);
}

export function hasProblemMessage(slug: string, locale: Locale = getLocale()) {
  return Object.prototype.hasOwnProperty.call(CATALOGS[locale].problems, slug);
}

export function hasReasonMessage(slug: string, reason: string, locale: Locale = getLocale()) {
  const reasons = CATALOGS[locale].reasons[slug];
  return reasons !== undefined && Object.prototype.hasOwnProperty.call(reasons, reason);
}

export function genericMessage(status: number, requestId: string | null, locale: Locale = getLocale()) {
  const catalog = CATALOGS[locale];
  const message = catalog.generic.byStatus(status);
  return requestId ? catalog.generic.errorCode(message, requestId) : message;
}

export function clientMessage(key: ClientMessageKey, locale: Locale = getLocale()) {
  return CATALOGS[locale].generic[key];
}

export function withErrorCode(message: string, requestId: string | null, locale: Locale = getLocale()) {
  return requestId ? CATALOGS[locale].generic.errorCode(message, requestId) : message;
}
