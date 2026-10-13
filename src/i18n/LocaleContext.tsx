import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateLanguage } from "../api/endpoints";
import type { UserProfile } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useMe } from "../auth/useMe";
import { getLocale, isLocale, setLocale, storeLocale, subscribeLocale, type Locale } from "./locale";
import { MESSAGES, type Messages } from "./messages";

interface LocaleContextValue {
  locale: Locale;
  t: Messages;
  changeLocale: (next: Locale) => void;
  saving: boolean;
  saveError: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { me } = useMe();
  const [locale, setLocaleState] = useState<Locale>(getLocale);

  useEffect(() => subscribeLocale(setLocaleState), []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.querySelector('meta[name="description"]')?.setAttribute("content", MESSAGES[locale].layout.metaDescription);
  }, [locale]);

  const accountLocale = isLocale(me?.language) ? me.language : null;
  useEffect(() => {
    if (!isAuthenticated || !accountLocale) return;
    setLocale(accountLocale);
    storeLocale(accountLocale);
  }, [isAuthenticated, accountLocale]);

  const { mutate, reset, isPending, isError } = useMutation({
    mutationFn: (next: Locale) => updateLanguage(next),
    onSuccess: (profile) => queryClient.setQueryData<UserProfile>(["me"], profile),
  });

  const changeLocale = useCallback(
    (next: Locale) => {
      if (!isLocale(next)) return;
      const previous = getLocale();
      setLocale(next);
      storeLocale(next);
      if (!isAuthenticated || accountLocale === next) {
        reset();
        return;
      }
      mutate(next, {
        onError: () => {
          setLocale(previous);
          storeLocale(previous);
        },
      });
    },
    [isAuthenticated, accountLocale, mutate, reset],
  );

  const value = useMemo(
    () => ({ locale, t: MESSAGES[locale], changeLocale, saving: isPending, saveError: isError }),
    [locale, changeLocale, isPending, isError],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useI18n must be used inside LocaleProvider");
  return context;
}
