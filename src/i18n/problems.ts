export type Locale = "pt-BR";

export interface ProblemContext {
  status: number;
  retryAfter: number | null;
  detail: string | null;
  properties: Record<string, unknown>;
}

type Message = string | ((context: ProblemContext, locale: Locale) => string);

export type ProblemScope = "checkout-coupon" | "coupon-management" | "transfer" | "check-in" | "login" | "password-change" | "lot";

interface Catalog {
  problems: Record<string, Message>;
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
    "ticket-type-name-already-exists": "Já existe um lote com esse nome neste evento.",
    "invalid-order-state": "Este pedido não permite mais esta ação. Atualize a página para ver a situação atual.",
    "insufficient-stock": "Não há mais ingressos suficientes neste lote.",
    "mixed-events-order": "Um pedido só pode ter ingressos de um mesmo evento.",
    "max-per-order-exceeded": "A quantidade passa do limite de ingressos por pedido deste lote.",
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
  },
  scopes: {
    "checkout-coupon": {
      "ticket-type-not-found": "Algum ingresso do pedido não está mais à venda.",
      "validation-failed": "Confira o código do cupom.",
    },
    "coupon-management": {
      "invalid-coupon-settings": ({ detail }) =>
        detail && /maxUses/.test(detail)
          ? "O limite de usos não pode ficar abaixo dos usos já feitos."
          : detail && /endsAt/.test(detail)
            ? "O fim da validade precisa ser depois do início."
            : "Percentual precisa estar entre 0,01 e 100.",
      "invalid-event-state": "O evento foi cancelado e os cupons não podem mais ser alterados.",
      "validation-failed": "Confira os campos do cupom.",
    },
    transfer: {
      "invalid-ticket-state": "Este ingresso não pode mais ser transferido.",
      "invalid-event-state": "Este ingresso não pode mais ser transferido.",
      "ticket-not-found": "Este ingresso não pode mais ser transferido.",
    },
    "check-in": {
      "invalid-ticket-state": "Ingresso já utilizado ou cancelado.",
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
      "invalid-ticket-type-quantity": ({ detail }) =>
        detail && /quantityTotal/i.test(detail) ? "Abaixo do que já foi vendido ou reservado." : "Quantidade inválida para o lote.",
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

export const CATALOGS: Record<Locale, Catalog> = { "pt-BR": PT_BR };

export const LOCALES = Object.keys(CATALOGS) as Locale[];

let currentLocale: Locale = "pt-BR";

export const getLocale = () => currentLocale;

export function setLocale(locale: Locale) {
  if (CATALOGS[locale]) currentLocale = locale;
}

const resolve = (message: Message, context: ProblemContext, locale: Locale) =>
  typeof message === "function" ? message(context, locale) : message;

export function problemMessage(
  slug: string | null,
  context: ProblemContext,
  scope?: ProblemScope,
  locale: Locale = currentLocale,
): string | null {
  if (!slug) return null;
  const catalog = CATALOGS[locale];
  const message = (scope ? catalog.scopes[scope][slug] : undefined) ?? catalog.problems[slug];
  return message === undefined ? null : resolve(message, context, locale);
}

export function problemText(slug: string, locale: Locale = currentLocale): string | null {
  return problemMessage(slug, { status: 0, retryAfter: null, detail: null, properties: {} }, undefined, locale);
}

export function hasProblemMessage(slug: string, locale: Locale = currentLocale) {
  return Object.prototype.hasOwnProperty.call(CATALOGS[locale].problems, slug);
}

export function genericMessage(status: number, requestId: string | null, locale: Locale = currentLocale) {
  const catalog = CATALOGS[locale];
  const message = catalog.generic.byStatus(status);
  return requestId ? catalog.generic.errorCode(message, requestId) : message;
}

export function clientMessage(key: "network" | "timeout" | "invalidRoute" | "unexpected", locale: Locale = currentLocale) {
  return CATALOGS[locale].generic[key];
}

export function withErrorCode(message: string, requestId: string | null, locale: Locale = currentLocale) {
  return requestId ? CATALOGS[locale].generic.errorCode(message, requestId) : message;
}
