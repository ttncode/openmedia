"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "../format";
import { en, type Messages } from "./en";
import { vi } from "./vi";

export type LanguagePreference = "auto" | Locale;

const DICTIONARIES: Record<Locale, Messages> = { en, vi };

export function resolveLocale(
  preference: LanguagePreference,
  navigatorLanguage: string,
): Locale {
  if (preference !== "auto") return preference;
  return navigatorLanguage.toLowerCase().startsWith("vi") ? "vi" : "en";
}

interface I18nValue {
  readonly locale: Locale;
  readonly t: Messages;
}

const I18nContext = createContext<I18nValue>({ locale: "en", t: en });

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}): ReactNode {
  const value = useMemo(() => ({ locale, t: DICTIONARIES[locale] }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
