import { Component, type ReactNode } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
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
  const t = MESSAGES[getLocale()].errorBoundary;
  const wrapper = scope === "app" ? "flex min-h-screen items-center justify-center bg-canvas px-4 py-16" : "py-16 sm:py-24";
  return (
    <div className={wrapper}>
      <div role="alert" className="mx-auto max-w-lg text-center">
        <TriangleAlert size={48} className="mx-auto text-accent-text" aria-hidden />
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink">{reloading ? t.reloadingTitle : t.title}</h1>
        <p className="mt-2 text-muted">{reloading ? t.reloadingHint : t.hint}</p>
        {!reloading && (
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={onRetry} className={buttonClass("primary")}>
              <RefreshCw size={17} aria-hidden /> {t.retry}
            </button>
            <a href="/" className={buttonClass("secondary")}>
              {t.backHome}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
