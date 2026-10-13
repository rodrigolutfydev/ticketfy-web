import { useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { CircleCheck, CircleX, ScanLine } from "lucide-react";
import { errorMessage } from "../../api/client";
import { checkIn } from "../../api/endpoints";
import { Button, Card, PageTitle } from "../../components/ui";
import { formatTime } from "../../utils/format";
import { normalizeTicketCode } from "../../utils/security";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useI18n } from "../../i18n/LocaleContext";

type HistoryEntry = { code: string; ok: boolean; detail: string; at: string };

// Tela da portaria: valida o código do ingresso na entrada do evento.
// O código só vale uma vez: a API marca como USED no primeiro check-in
// e devolve 409 nas tentativas seguintes.
export default function CheckInPage() {
  const { t, locale } = useI18n();
  const c = t.organizer.checkIn;
  usePageTitle(c.pageTitle);
  const [code, setCode] = useState("");
  // Últimas validações desta sessão, para o porteiro conferir o que passou.
  // Fica só na memória da página: some ao recarregar.
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (value: string) => checkIn(value),
    onSuccess: (ticket, value) => {
      record(value, true, `${ticket.eventName}, ${ticket.ticketTypeName}`);
      setCode("");
      inputRef.current?.focus(); // pronto para o próximo da fila
    },
    onError: (error, value) => record(value, false, describe(error)),
  });

  function record(value: string, ok: boolean, detail: string) {
    setHistory((h) => [{ code: value, ok, detail, at: new Date().toISOString() }, ...h].slice(0, 8));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const normalized = normalizeTicketCode(code);
    if (normalized.length >= 6 && !mutation.isPending) mutation.mutate(normalized);
  }

  return (
    <div className="max-w-2xl">
      <PageTitle title={c.title} subtitle={c.subtitle} />
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">{c.code}</span>
            <input
              ref={inputRef}
              autoFocus
              value={code}
              onChange={(e) => {
                setCode(normalizeTicketCode(e.target.value));
                mutation.reset();
              }}
              maxLength={32}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="ABCD1234EFGH5678"
              className="w-full rounded-xl border border-line bg-raised px-4 py-4 text-center font-mono text-2xl tracking-[0.25em] text-ink outline-none placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
          </label>
          <Button type="submit" size="lg" className="w-full" loading={mutation.isPending} disabled={code.length < 6}>
            <ScanLine size={18} aria-hidden /> {c.submit}
          </Button>
        </form>

        {mutation.isSuccess && (
          <Result ok title={c.allowed} detail={`${mutation.data.eventName}, ${mutation.data.ticketTypeName}`} />
        )}
        {mutation.isError && <Result ok={false} title={c.denied} detail={describe(mutation.error)} />}
      </Card>

      {history.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-bold text-ink">{c.history}</h2>
          <ul className="divide-y divide-line overflow-hidden elevated rounded-2xl border border-line bg-surface text-sm">
            {history.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="flex items-center gap-3 px-4 py-3">
                {entry.ok ? <CircleCheck size={18} className="shrink-0 text-success" aria-label={c.allowedShort} /> : <CircleX size={18} className="shrink-0 text-danger" aria-label={c.deniedShort} />}
                <span className="font-mono font-semibold text-ink">{entry.code}</span>
                <span className="min-w-0 flex-1 truncate text-muted">{entry.detail}</span>
                <span className="text-subtle">{formatTime(entry.at, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// Traduz o erro da API para algo que o porteiro entende na hora.
function describe(error: unknown) {
  return errorMessage(error, "check-in") ?? "";
}

function Result({ ok, title, detail }: { ok: boolean; title: string; detail: string }) {
  return (
    <div
      role="status"
      className={`mt-5 flex items-center gap-4 rounded-2xl border p-5 ${ok ? "border-success/40 bg-success/10 text-success" : "border-danger/40 bg-danger/10 text-danger"}`}
    >
      {ok ? <CircleCheck size={40} aria-hidden /> : <CircleX size={40} aria-hidden />}
      <div>
        <p className="text-2xl font-extrabold">{title}</p>
        <p className="mt-0.5 text-ink">{detail}</p>
      </div>
    </div>
  );
}
