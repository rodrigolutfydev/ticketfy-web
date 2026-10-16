// Funções de segurança usadas em várias telas.
//
// Lembrete importante: o frontend roda no computador do usuário, então
// qualquer pessoa pode alterar o código dele no navegador. Nada aqui
// substitui a validação da API. O papel destas funções é:
//   1. não deixar a própria interface ser usada contra o usuário
//      (links maliciosos, imagens de origem estranha, redirecionamentos);
//   2. não mandar para a API dados que ela vai recusar de qualquer jeito;
//   3. dificultar abusos simples (como chutar senhas pela tela de login).

// ---------------------------------------------------------------------------
// Identificadores
// ---------------------------------------------------------------------------

// IDs que vêm da URL (/events/:id, /orders/:id, ?event=...) são texto que
// qualquer um pode digitar. Antes de montar uma rota da API com eles,
// conferimos que só têm letras, números e hífen. Isso impede que alguém
// monte um link como /events/..%2Fusers%2Fme e faça o navegador chamar
// outra rota da API com o token do usuário logado.
// Aceita UUID (formato atual da API) e também números, por segurança.
const ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

export function isValidId(value: string | null | undefined): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

// ---------------------------------------------------------------------------
// Redirecionamento depois do login
// ---------------------------------------------------------------------------

// Depois do login, voltamos para a página que o usuário tentou abrir.
// Esse destino nunca pode apontar para fora do site: "//site-falso.com"
// ou "https://site-falso.com" seria um "open redirect", golpe clássico de
// phishing (o link parece do Ticketfy, mas termina em outro lugar).
const REDIRECT_BASE = "https://ticketfy.invalid";
const MAX_REDIRECT_LENGTH = 2048;

export function safeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || value.length > MAX_REDIRECT_LENGTH) return fallback;
  // Precisa começar com uma barra só. "//" e "/\" o navegador entende como outro domínio.
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001F\u007F]/.test(value)) return fallback;
  let url: URL;
  try {
    url = new URL(value, REDIRECT_BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== REDIRECT_BASE) return fallback;
  // Não volta para as próprias telas de login/cadastro (evita laço).
  if (isAuthPath(value) || isAuthPath(url.pathname)) return fallback;
  return value;
}

const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/auth/"];
const isAuthPath = (path: string) => AUTH_PATHS.some((prefix) => path.startsWith(prefix));

// ---------------------------------------------------------------------------
// Imagens de evento
// ---------------------------------------------------------------------------

// A foto do evento é um endereço (URL) cadastrado pelo organizador.
// Só aceitamos https:
// - "javascript:" e "data:" poderiam carregar conteúdo arbitrário;
// - "http:" deixaria a imagem trafegar sem criptografia (e o navegador
//   avisa "conteúdo misto" num site https);
// - usuário e senha embutidos (https://user:senha@site) são sinal de golpe.
export function safeImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.href;
  } catch {
    return null; // não é uma URL válida
  }
}

// ---------------------------------------------------------------------------
// Código do ingresso (check-in)
// ---------------------------------------------------------------------------

// Normaliza o que o porteiro digitou: maiúsculas, sem espaços nem hífens,
// apenas letras e números. Assim "abcd-1234 efgh" vira "ABCD1234EFGH".
export function normalizeTicketCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
}

// ---------------------------------------------------------------------------
// Força da senha
// ---------------------------------------------------------------------------

export type PasswordTip = "common" | "personal" | "length" | "mix";

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  tips: PasswordTip[];
}

// Senhas que aparecem no topo de todo vazamento. A API deveria ter uma
// lista maior; aqui é só para avisar cedo quem digitou uma delas.
const COMMON_PASSWORDS = new Set([
  "12345678", "123456789", "1234567890", "password", "password1", "senha123", "senha1234",
  "qwerty123", "abc12345", "11111111", "00000000", "iloveyou", "ticketfy", "ticketfy123",
]);

// Avaliação simples, sem bibliotecas: comprimento conta mais que símbolos.
export function passwordStrength(password: string, context: string[] = []): PasswordStrength {
  const tips: PasswordTip[] = [];
  if (!password) return { score: 0, tips };

  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    return { score: 0, tips: ["common"] };
  }
  // Senha que contém o próprio nome ou e-mail é fácil de adivinhar.
  const personal = context
    .map((part) => part.toLowerCase().split("@")[0].trim())
    .filter((part) => part.length >= 3);
  if (personal.some((part) => lower.includes(part))) {
    tips.push("personal");
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

  if (password.length < 12) tips.push("length");
  if (!/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) tips.push("mix");
  if (tips.includes("personal")) score = Math.max(0, score - 1);

  const final = Math.min(score, 4) as PasswordStrength["score"];
  return { score: final, tips };
}

// ---------------------------------------------------------------------------
// Freio de tentativas de login
// ---------------------------------------------------------------------------

// Depois de 5 senhas erradas seguidas, a tela de login trava por um tempo
// que dobra a cada novo erro (30 s, 60 s, 120 s... até 5 min).
// Isso atrapalha quem tenta adivinhar senhas pela interface, mas a proteção
// de verdade contra força bruta precisa estar na API (limite por IP/e-mail,
// resposta 429). Recarregar a página zera este contador.
const FREE_ATTEMPTS = 5;
const BASE_LOCK_MS = 30_000;
const MAX_LOCK_MS = 5 * 60_000;

let failedAttempts = 0;
let lockedUntil = 0;

export const loginThrottle = {
  // Milissegundos que ainda faltam de bloqueio (0 = liberado).
  remainingMs: () => Math.max(0, lockedUntil - Date.now()),
  registerFailure() {
    failedAttempts++;
    if (failedAttempts >= FREE_ATTEMPTS) {
      const extra = failedAttempts - FREE_ATTEMPTS;
      lockedUntil = Date.now() + Math.min(BASE_LOCK_MS * 2 ** extra, MAX_LOCK_MS);
    }
  },
  registerSuccess() {
    failedAttempts = 0;
    lockedUntil = 0;
  },
  // A API respondeu 429 com Retry-After: trava pelo tempo que ela pediu.
  lockFor(seconds: number) {
    lockedUntil = Math.max(lockedUntil, Date.now() + seconds * 1000);
  },
};

// ---------------------------------------------------------------------------
// Links externos
// ---------------------------------------------------------------------------

// Link para o Google Maps com o endereço do evento. O texto do endereço vai
// codificado (encodeURIComponent), então não tem como "quebrar" a URL.
export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
