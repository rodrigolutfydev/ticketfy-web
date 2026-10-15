import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, Download, ExternalLink } from "lucide-react";
import { apiDownload } from "../api/client";
import { getEvent } from "../api/endpoints";
import { useI18n } from "../i18n/LocaleContext";
import { calendarFileUrl, eventPageUrl, googleCalendarUrl, withDefaultEnd, type CalendarEvent } from "../utils/calendar";
import { saveBlob } from "../utils/download";
import { Button } from "./ui";

interface Props {
  eventId: string;
  event?: CalendarEvent;
  size?: "sm" | "md";
  variant?: "ghost" | "secondary";
}

export default function AddToCalendar({ eventId, event, size = "sm", variant = "ghost" }: Props) {
  const { t } = useI18n();
  const c = t.calendar;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const eventQuery = useQuery({ queryKey: ["event", eventId], queryFn: () => getEvent(eventId), enabled: open && !event });
  const details: CalendarEvent | undefined = event ?? eventQuery.data;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Baixa o .ics da API e completa o horário de fim (3 h) quando o evento
  // não tem um. Se a chamada falhar, cai no link direto da API.
  async function downloadIcs() {
    setOpen(false);
    try {
      const { blob, filename } = await apiDownload(`/events/${encodeURIComponent(eventId)}/calendar.ics`, { accept: "text/calendar" });
      saveBlob(new Blob([withDefaultEnd(await blob.text())], { type: "text/calendar;charset=utf-8" }), filename ?? "ticketfy-event.ics");
    } catch {
      window.location.assign(calendarFileUrl(eventId));
    }
  }

  const item =
    "flex w-full items-start gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-sm font-medium text-ink transition-colors hover:bg-ink/[0.05] [&>svg]:text-accent-text";

  return (
    <div ref={ref} className="relative">
      <Button variant={variant} size={size} onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu">
        <CalendarPlus size={16} aria-hidden /> {c.add}
      </Button>
      {open && (
        <div role="menu" aria-label={c.menuLabel} className="absolute right-0 z-30 mt-2 w-64 rounded-2xl bg-surface p-2 text-left shadow-[inset_0_0_0_1px_var(--line),0_24px_60px_rgb(0_0_0/0.6)]">
          <a
            role="menuitem"
            href={calendarFileUrl(eventId)}
            className={item}
            onClick={(e) => {
              e.preventDefault();
              void downloadIcs();
            }}
          >
            <Download size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              <span className="block">{c.download}</span>
              <span className="block text-xs text-muted">{c.downloadHint}</span>
            </span>
          </a>
          {details ? (
            <a
              role="menuitem"
              href={googleCalendarUrl(details, eventPageUrl(window.location.origin, eventId))}
              target="_blank"
              rel="noopener noreferrer"
              className={item}
              onClick={() => setOpen(false)}
            >
              <ExternalLink size={16} className="mt-0.5 shrink-0" aria-hidden />
              {c.google}
            </a>
          ) : (
            <p className="px-3 py-2 text-sm text-muted" role="status">
              {eventQuery.isError ? c.googleUnavailable : c.googleLoading}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
