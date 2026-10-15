import { useSyncExternalStore } from "react";
import { isWaitingSlowRequest, subscribeSlowRequests } from "../api/client";
import { useI18n } from "../i18n/LocaleContext";

export default function ServerWakeNotice() {
  const { t } = useI18n();
  const slow = useSyncExternalStore(subscribeSlowRequests, isWaitingSlowRequest, () => false);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      {slow && (
        // Plaquinha "acendendo": anel laranja girando e brilho de neon em volta.
        <div className="flex max-w-md items-center gap-3.5 rounded-2xl bg-surface px-4 py-3.5 text-[0.9375rem] text-ink shadow-[inset_0_0_0_1px_var(--accent-line),0_0_32px_var(--accent-glow),0_18px_40px_rgb(0_0_0/0.55)]">
          <span className="relative flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
            <span className="absolute inset-0 animate-spin rounded-full border-2 border-accent-line border-t-accent" />
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
          </span>
          <p>{t.serverWake.message}</p>
        </div>
      )}
    </div>
  );
}
