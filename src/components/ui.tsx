// Peças básicas de interface. Toda tela monta a partir delas, então mudar
// um estilo aqui muda o projeto inteiro de uma vez.
//
// As cores vêm das variáveis do tema (bg-surface, text-ink, bg-accent...),
// definidas em index.css. Por isso nenhum componente precisa saber se o
// tema atual é claro ou escuro.

import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router";
import { ArrowLeft, CircleCheck, Eye, EyeOff, Info, TriangleAlert } from "lucide-react";

// ---------------------------------------------------------------------------
// Botões
// ---------------------------------------------------------------------------

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink shadow-[0_8px_24px_-8px_var(--accent)] hover:bg-accent-strong disabled:opacity-50 disabled:shadow-none",
  secondary: "border border-line-strong bg-surface text-ink hover:border-accent hover:text-accent-text disabled:opacity-50",
  danger: "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20 disabled:opacity-50",
  ghost: "text-muted hover:bg-raised hover:text-ink disabled:opacity-50",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed";

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${buttonBase} ${variants[variant]} ${sizes[size]} ${extra}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean };

export function Button({ variant = "primary", size = "md", loading = false, className = "", children, disabled, type = "button", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      // type="button" por padrão: dentro de um <form>, o padrão do HTML é "submit",
      // e um botão qualquer acabaria enviando o formulário sem querer.
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}

// Link com aparência de botão. Antes o projeto usava <Link><Button/></Link>,
// que coloca um botão dentro de um link: HTML inválido, e o leitor de tela
// anuncia dois elementos para uma única ação.
export function ButtonLink({ variant = "primary", size = "md", className = "", ...props }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link {...props} className={buttonClass(variant, size, className)} />;
}

// Link "← Voltar" usado no topo das telas internas.
export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <ArrowLeft size={16} aria-hidden />
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Campos de formulário
// ---------------------------------------------------------------------------

const fieldClass =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-subtle outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-60";

// O <label> envolve o campo: clicar no texto foca o campo, e o leitor de
// tela anuncia o nome certo, sem precisar de id/htmlFor.
export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-danger">{error}</span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>
      )}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${props.className ?? ""}`} />;
}

// Campo de senha com botão de mostrar/ocultar.
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative block">
      <input
        {...props}
        type={visible ? "text" : "password"}
        // Evita que o teclado do celular "corrija" ou capitalize a senha.
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className={`${fieldClass} pr-11 ${props.className ?? ""}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-subtle hover:text-ink"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </span>
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldClass} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldClass} ${props.className ?? ""}`} />;
}

// ---------------------------------------------------------------------------
// Mensagens e contêineres
// ---------------------------------------------------------------------------

const alertStyles = {
  error: ["border-danger/35 bg-danger/10 text-danger", TriangleAlert],
  success: ["border-success/35 bg-success/10 text-success", CircleCheck],
  info: ["border-info/35 bg-info/10 text-info", Info],
  warning: ["border-warning/35 bg-warning/10 text-warning", TriangleAlert],
} as const;

export function Alert({ type = "error", children }: { type?: keyof typeof alertStyles; children: ReactNode }) {
  const [style, Icon] = alertStyles[type];
  // role="alert" faz o leitor de tela ler a mensagem assim que ela aparece.
  return (
    <div role={type === "error" ? "alert" : "status"} className={`flex gap-2.5 rounded-xl border px-4 py-3 text-sm ${style}`}>
      <Icon size={18} className="mt-px shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`elevated rounded-2xl border border-line bg-surface p-6 ${className}`}>{children}</div>;
}

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// Par "rótulo: valor" para fichas de informação (evento, pedido, conta).
export function InfoRow({ icon, label, children }: { icon?: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      {icon && <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-raised text-accent-text">{icon}</div>}
      <div className="min-w-0">
        <dt className="text-sm text-muted">{label}</dt>
        <dd className="font-medium text-ink">{children}</dd>
      </div>
    </div>
  );
}

// Bloco cinza pulsante que ocupa o lugar do conteúdo enquanto ele carrega.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-raised ${className}`} aria-hidden />;
}
