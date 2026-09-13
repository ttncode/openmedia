"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
} from "react";
import { I18nProvider, resolveLocale } from "@/lib/i18n/I18nProvider";
import {
  loadPersisted,
  saveHistory,
  saveItems,
  savePreferences,
} from "@/lib/preferences";
import { applyAccent, applyTheme } from "@/lib/theme";
import { createCommands, type Commands } from "./commands";
import { initialState } from "./reducer";
import { createStore } from "./store";
import type { Action, AppState } from "./types";
import { useJobPolling } from "./useJobPolling";

interface StoreValue {
  readonly state: AppState;
  readonly dispatch: Dispatch<Action>;
  readonly commands: Commands;
}

const StoreContext = createContext<StoreValue | null>(null);
const ACTIVE_STATUSES = new Set(["queued", "downloading", "processing"]);

function createInitialState(): AppState {
  const persisted = loadPersisted();
  return {
    ...initialState(persisted.preferences),
    items: persisted.items,
    history: persisted.history,
  };
}

export function StoreProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const [store] = useState(() => createStore(createInitialState()));
  const [commands] = useState(() =>
    createCommands(store.dispatch, store.getState),
  );
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const { dispatch } = store;

  useEffect(() => {
    void commands.loadServerState();
  }, [commands]);

  useEffect(() => {
    savePreferences(state.preferences);
    applyTheme(state.preferences.theme);
    applyAccent(state.preferences.accent);
  }, [state.preferences]);

  useEffect(() => {
    saveItems(state.items);
  }, [state.items]);

  useEffect(() => {
    saveHistory(state.history);
  }, [state.history]);

  const hasActiveJobs = state.items.some(
    (item) => item.type === "job" && ACTIVE_STATUSES.has(item.job.status),
  );
  const canPoll =
    state.session !== null &&
    (!state.session.auth_required || state.session.authenticated);
  useJobPolling(commands.syncJobs, hasActiveJobs, canPoll);

  const locale = resolveLocale(
    state.preferences.language,
    typeof navigator === "undefined" ? "en" : navigator.language,
  );
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(
    () => ({ state, dispatch, commands }),
    [state, dispatch, commands],
  );
  return (
    <StoreContext.Provider value={value}>
      <I18nProvider locale={locale}>{children}</I18nProvider>
    </StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (value === null)
    throw new Error("useStore must be used inside StoreProvider");
  return value;
}
