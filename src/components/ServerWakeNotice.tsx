import { useSyncExternalStore } from "react";
import { isWaitingSlowRequest, subscribeSlowRequests } from "../api/client";
import { useI18n } from "../i18n/LocaleContext";

export default function ServerWakeNotice() {
  const { t } = useI18n();
  const slow = useSyncExternalStore(subscribeSlowRequests, isWaitingSlowRequest, () => false);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      {slow && (
        <div className="flex max-w-md items-center gap-3 rounded-2xl border border-line-strong bg-surface px-4 py-3 text-sm text-ink shadow-2xl">
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden />
          <p>{t.serverWake.message}</p>
        </div>
      )}
    </div>
  );
}
