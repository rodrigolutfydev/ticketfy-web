// Peças básicas de interface. Toda tela monta a partir delas, então mudar
// um estilo aqui muda o projeto inteiro de uma vez.
//
// As cores vêm das variáveis do tema (bg-surface, text-ink, bg-accent...),
// definidas em index.css. Por isso nenhum componente precisa saber se o
// tema atual é claro ou escuro.

import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router";
import { ArrowLeft, CircleCheck, Eye, EyeOff, Info, TriangleAlert } from "lucide-react";
import { useI18n } from "../i18n/LocaleContext";

// ---------------------------------------------------------------------------
// Botões
// ---------------------------------------------------------------------------

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

// Os efeitos (subir com mola, brilho que atravessa, afundar ao clicar) vêm
// da classe tf-btn, em index.css. O ghost fica sem efeito: é um botão discreto.
const variants: Record<Variant, string> = {
  primary: "tf-btn tf-btn-primary bg-accent text-accent-ink hover:bg-accent disabled:opacity-45 disabled:shadow-none",
  secondary:
    "tf-btn border border-ink/30 bg-transparent text-ink hover:border-ink hover:bg-ink/[0.07] disabled:opacity-45",
  danger: "tf-btn border border-danger/45 bg-danger/10 text-danger hover:border-danger hover:bg-danger/20 disabled:opacity-45",
  ghost: "text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:opacity-45",
};

const sizes: Record<Size, string> = {
  sm: "h-9 rounded-[10px] px-3.5 text-sm",
  md: "h-11 rounded-xl px-5 text-[0.9375rem]",
  lg: "h-[54px] rounded-[14px] px-6 text-base",
};

const buttonBase = "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap disabled:cursor-not-allowed";

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
    <Link to={to} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-accent-text">
      <ArrowLeft size={16} aria-hidden />
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Campos de formulário (sem efeitos 3D: formulário é para ler e digitar)
// ---------------------------------------------------------------------------

export const fieldClass =
  "w-full rounded-[14px] border-0 bg-field px-4 py-3 text-base text-ink outline-none shadow-[inset_0_0_0_1px_var(--line)] transition-shadow placeholder:text-subtle hover:shadow-[inset_0_0_0_1px_var(--line-strong)] focus:shadow-[inset_0_0_0_1.5px_var(--accent),0_0_0_4px_var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-45 aria-[invalid=true]:shadow-[inset_0_0_0_1.5px_var(--danger)]";

// O <label> envolve o campo: clicar no texto foca o campo, e o leitor de
// tela anuncia o nome certo, sem precisar de id/htmlFor.
export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 flex items-center gap-1.5 text-[0.8125rem] text-danger">
          <TriangleAlert size={14} className="shrink-0" aria-hidden />
          {error}
        </span>
      ) : (
        hint && <span className="mt-1.5 block text-[0.8125rem] text-muted">{hint}</span>
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
  const { t } = useI18n();
  return (
    <span className="relative block">
      <input
        {...props}
        type={visible ? "text" : "password"}
        // Evita que o teclado do celular "corrija" ou capitalize a senha.
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className={`${fieldClass} pr-12 ${props.className ?? ""}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[10px] text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
        aria-label={visible ? t.ui.hidePassword : t.ui.showPassword}
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
  return <textarea {...props} className={`${fieldClass} leading-relaxed ${props.className ?? ""}`} />;
}

// ---------------------------------------------------------------------------
// Mensagens e contêineres
// ---------------------------------------------------------------------------

const alertStyles = {
  error: ["bg-danger/10 text-ink shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--danger)_40%,transparent)] [&>svg]:text-danger", TriangleAlert],
  success: ["bg-success/10 text-ink shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--success)_35%,transparent)] [&>svg]:text-success", CircleCheck],
  info: ["bg-info/10 text-ink shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--info)_35%,transparent)] [&>svg]:text-info", Info],
  warning: ["bg-accent-soft text-ink shadow-[inset_0_0_0_1px_var(--accent-line)] [&>svg]:text-accent-text", TriangleAlert],
} as const;

export function Alert({ type = "error", children }: { type?: keyof typeof alertStyles; children: ReactNode }) {
  const [style, Icon] = alertStyles[type];
  // role="alert" faz o leitor de tela ler a mensagem assim que ela aparece.
  return (
    <div role={type === "error" ? "alert" : "status"} className={`flex gap-3 rounded-[14px] px-4 py-3.5 text-[0.9375rem] leading-snug ${style}`}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// Painel padrão (cartão escuro com fio claro por dentro).
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`tf-panel p-6 sm:p-7 ${className}`}>{children}</div>;
}

// Cabeçalho das telas internas: rótulo laranja opcional, título grande e ações à direita.
export function PageTitle({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
      <div className="flex max-w-2xl flex-col gap-2.5">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-extrabold leading-[1.04] tracking-[-0.045em] text-ink">{title}</h1>
        {subtitle && <p className="text-[1.0625rem] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// Par "rótulo: valor" para fichas de informação (evento, pedido, conta).
export function InfoRow({ icon, label, children }: { icon?: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      {icon && <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">{icon}</div>}
      <div className="min-w-0">
        <dt className="text-sm text-muted">{label}</dt>
        <dd className="font-medium text-ink">{children}</dd>
      </div>
    </div>
  );
}

// Bloco com brilho passando que ocupa o lugar do conteúdo enquanto ele carrega.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`tf-shimmer rounded-lg ${className}`} aria-hidden />;
}
