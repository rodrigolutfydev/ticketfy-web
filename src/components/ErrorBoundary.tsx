import { Component, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import NeonSign from "./NeonSign";
import { getLocale } from "../i18n/locale";
import { MESSAGES } from "../i18n/messages";
import { buttonClass } from "./ui";

export const CHUNK_RELOAD_KEY = "ticketfy.chunkReload";

const CHUNK_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /unable to preload css/i,
  /loading (css )?chunk [\w-]+ failed/i,
];

type ReloadStorage = Pick<Storage, "getItem" | "setItem">;

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "ChunkLoadError") return true;
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(error.message));
}

export function reloadOnceForChunk(storage: ReloadStorage | null, reload: () => void): boolean {
  if (!storage) return false;
  try {
    if (storage.getItem(CHUNK_RELOAD_KEY) !== null) return false;
    storage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  reload();
  return true;
}

function sessionStore(): ReloadStorage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

function reloadPage() {
  window.location.reload();
}

export type ErrorBoundaryScope = "app" | "page";

interface ErrorBoundaryProps {
  children: ReactNode;
  scope: ErrorBoundaryScope;
  resetKey?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  chunk: boolean;
  reloading: boolean;
}

const INITIAL_STATE: ErrorBoundaryState = { hasError: false, chunk: false, reloading: false };

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = INITIAL_STATE;

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return { hasError: true, chunk: isChunkLoadError(error) };
  }

  componentDidCatch(error: unknown) {
    if (isChunkLoadError(error) && reloadOnceForChunk(sessionStore(), reloadPage)) this.setState({ reloading: true });
  }

  componentDidUpdate(previous: ErrorBoundaryProps) {
    if (this.state.hasError && previous.resetKey !== this.props.resetKey) this.setState(INITIAL_STATE);
  }

  retry = () => {
    if (this.state.chunk) {
      reloadPage();
      return;
    }
    this.setState(INITIAL_STATE);
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return <ErrorFallback scope={this.props.scope} reloading={this.state.reloading} onRetry={this.retry} />;
  }
}

export function ErrorFallback({ scope, reloading, onRetry }: { scope: ErrorBoundaryScope; reloading: boolean; onRetry: () => void }) {
  const messages = MESSAGES[getLocale()];
  const t = messages.errorBoundary;
  const wrapper = scope === "app" ? "flex min-h-screen items-center justify-center bg-canvas px-4 py-16" : "py-6 sm:py-10";
  return (
    <div className={wrapper}>
      <div role="alert" className="mx-auto w-full max-w-[1100px]">
        <NeonSign word={messages.look.neon.error} title={reloading ? t.reloadingTitle : t.title} hint={reloading ? t.reloadingHint : t.hint}>
          {!reloading && (
            <>
              <button type="button" onClick={onRetry} className={buttonClass("primary", "lg")}>
                <RefreshCw size={17} aria-hidden /> {t.retry}
              </button>
              <a href="/" className={buttonClass("secondary", "lg", "!border-white/40 !text-white hover:!border-white")}>
                {t.backHome}
              </a>
            </>
          )}
        </NeonSign>
      </div>
    </div>
  );
}
