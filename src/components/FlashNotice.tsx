import { useEffect, useSyncExternalStore } from "react";
import { useLocation } from "react-router";
import { X } from "lucide-react";
import { useI18n } from "../i18n/LocaleContext";
import { Alert } from "./ui";

export interface Flash {
  text: string;
  path: string;
}

let current: Flash | null = null;
let seen = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function showFlash(text: string, path: string) {
  current = { text, path: path.split(/[?#]/)[0] || "/" };
  seen = false;
  emit();
}

export function clearFlash() {
  current = null;
  seen = false;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const read = () => current;

export default function FlashNotice({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const flash = useSyncExternalStore(subscribe, read, () => null);
  const visible = flash !== null && flash.path === pathname;

  useEffect(() => {
    if (!flash) return;
    if (flash.path === pathname) seen = true;
    else if (seen) clearFlash();
  }, [flash, pathname]);

  if (!visible) return null;
  return (
    <div className={`mb-6 flex items-start gap-2 ${className}`}>
      <div className="min-w-0 flex-1">
        <Alert type="success">{flash.text}</Alert>
      </div>
      <button
        type="button"
        onClick={clearFlash}
        aria-label={t.layout.flash.dismiss}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
      >
        <X size={18} aria-hidden />
      </button>
    </div>
  );
}
