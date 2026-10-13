import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { setEventFeatured } from "../api/endpoints";
import { errorMessage } from "../api/client";
import { useMe } from "../auth/useMe";
import { useI18n } from "../i18n/LocaleContext";

// Interruptor "Em destaque": só aparece para ADMIN. A API recusa (403) para os demais.
export default function FeaturedToggle({ eventId, featured }: { eventId: string; featured: boolean }) {
  const { isAdmin } = useMe();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (value: boolean) => setEventFeatured(eventId, value),
    onSuccess: (event) => {
      queryClient.setQueryData(["event", eventId], event);
      queryClient.invalidateQueries({ queryKey: ["events"] }); // vitrine e listas
    },
  });

  if (!isAdmin) return null;
  const value = mutation.isPending ? !!mutation.variables : featured;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(!featured)}
        className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
          value ? "border-accent bg-accent/10 text-accent-text" : "border-line-strong text-muted hover:text-ink"
        }`}
      >
        <Star size={15} className={value ? "fill-current" : ""} aria-hidden />
        {t.eventDetail.featured}
      </button>
      {mutation.error && <span className="text-xs text-danger">{errorMessage(mutation.error)}</span>}
    </div>
  );
}
