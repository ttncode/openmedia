"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  PHONE_QUERY,
  TABLET_QUERY,
  useMediaQuery,
} from "@/hooks/useMediaQuery";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { linkFromShare, parseLinks } from "@/lib/links";
import { useStore } from "@/state/StoreProvider";
import type { PlaylistScope } from "@/state/types";
import { LoginScreen } from "../auth/LoginScreen";
import { IconButton } from "../controls/IconButton";
import { HistoryView } from "../history/HistoryView";
import { Importer } from "../importer/Importer";
import { Inspector } from "../inspector/Inspector";
import { AlertDialog } from "../overlays/AlertDialog";
import { DropOverlay } from "../overlays/DropOverlay";
import { Island } from "../overlays/Island";
import { ShortcutsHud } from "../overlays/ShortcutsHud";
import { QueueView } from "../queue/QueueView";
import { SettingsSheet } from "../settings/SettingsSheet";
import styles from "./shell.module.css";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { Toolbar } from "./Toolbar";
import { useShortcuts } from "./useShortcuts";

function readSharedLink(): string | null {
  const params = new URLSearchParams(window.location.search);
  return linkFromShare({ url: params.get("url"), text: params.get("text") });
}

export function AppShell(): ReactNode {
  const { t } = useI18n();
  const { state, dispatch, commands } = useStore();
  const isPhone = useMediaQuery(PHONE_QUERY);
  const isTablet = useMediaQuery(TABLET_QUERY);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [sharedLink] = useState<string | null>(() =>
    typeof window === "undefined" ? null : readSharedLink(),
  );
  const [linkText, setLinkText] = useState("");
  const [scope, setScope] = useState<PlaylistScope>("single");
  const [scrolled, setScrolled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusCookies, setFocusCookies] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [clearAlertOpen, setClearAlertOpen] = useState(false);
  const [inspectorSheetOpen, setInspectorSheetOpen] = useState(false);

  const submitLinks = useCallback(
    (urls: readonly string[], chosenScope: PlaylistScope): void => {
      setLinkText("");
      dispatch({ type: "view/changed", view: "queue", filter: "all" });
      void commands.fetchLinks(urls, chosenScope);
    },
    [commands, dispatch],
  );

  useEffect(() => {
    if (window.location.search)
      window.history.replaceState(null, "", window.location.pathname);
  }, []);

  useEffect(() => {
    if (!sharedLink) return;
    const timer = window.setTimeout(
      () => submitLinks([sharedLink], "single"),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [sharedLink, submitLinks]);

  useEffect(() => {
    const target = sentinel.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { root: scroller.current, rootMargin: "-52px 0px 0px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const pasteAnywhere = (event: ClipboardEvent): void => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        target.closest("input, textarea, select") !== null;
      const text = event.clipboardData?.getData("text") ?? "";
      if (typing || parseLinks(text).length === 0) return;
      event.preventDefault();
      submitLinks(parseLinks(text), "single");
    };
    document.addEventListener("paste", pasteAnywhere);
    return () => document.removeEventListener("paste", pasteAnywhere);
  }, [submitLinks]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [sidebarOpen]);

  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);
  const overlayOpen =
    settingsOpen || shortcutsOpen || clearAlertOpen || inspectorSheetOpen;
  useShortcuts({ inputRef, onShortcuts: openShortcuts, overlayOpen });

  const openSettings = (cookies = false): void => {
    setFocusCookies(cookies);
    setInspectorSheetOpen(false);
    setSettingsOpen(true);
  };

  if (state.session?.auth_required && !state.session.authenticated)
    return <LoginScreen />;

  const title =
    state.view === "history"
      ? t.history.title
      : {
          all: t.nav.queue,
          active: t.nav.downloading,
          done: t.nav.done,
          error: t.nav.attention,
        }[state.filter];

  return (
    <div
      className={styles.app}
      data-sidebar-open={sidebarOpen}
      data-scrolled={scrolled}
    >
      <Sidebar
        inert={isTablet && !sidebarOpen}
        onOpenSettings={() => openSettings()}
        onNavigate={() => setSidebarOpen(false)}
      />
      <main className={styles.content}>
        <Toolbar
          scrolled={scrolled}
          title={title}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          onOpenShortcuts={openShortcuts}
        />
        <div ref={scroller} className={styles.scroller}>
          <div className={styles.page}>
            <div className={styles.largeTitle}>
              <h1>{title}</h1>
            </div>
            <div
              ref={sentinel}
              className={styles.sentinel}
              aria-hidden="true"
            />
            <Importer
              value={linkText}
              onChange={setLinkText}
              onSubmit={submitLinks}
              scope={scope}
              onScopeChange={setScope}
              inputRef={inputRef}
              playlistLimit={state.session?.limits.max_playlist_items}
              onInvalid={() =>
                commands.notify({ tone: "info", message: "noLinks" })
              }
              onClipboardDenied={() =>
                commands.notify({ tone: "info", message: "pasteFallback" })
              }
            />
            {isPhone && !state.preferences.installHintDismissed ? (
              <div className={styles.installBanner}>
                <p>{t.importer.installHint}</p>
                <IconButton
                  label={t.importer.dismissInstallHint}
                  icon="x"
                  size="small"
                  onClick={() =>
                    dispatch({
                      type: "preferences/changed",
                      patch: { installHintDismissed: true },
                    })
                  }
                />
              </div>
            ) : null}
            {state.view === "history" ? (
              <HistoryView onClearRequest={() => setClearAlertOpen(true)} />
            ) : (
              <QueueView
                onOpenItem={() => setInspectorSheetOpen(true)}
                onOpenCookies={() => openSettings(true)}
              />
            )}
          </div>
        </div>
      </main>
      <Inspector
        sheetOpen={inspectorSheetOpen}
        onCloseSheet={() => setInspectorSheetOpen(false)}
        onOpenCookies={() => openSettings(true)}
      />
      {isPhone ? <TabBar onOpenSettings={() => openSettings()} /> : null}
      {sidebarOpen ? (
        <button
          type="button"
          className={styles.sidebarScrim}
          aria-label={t.shortcuts.dismiss}
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        focusCookies={focusCookies}
      />
      <ShortcutsHud
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
      <AlertDialog
        open={clearAlertOpen}
        title={t.history.clearTitle}
        message={t.history.clearMessage}
        confirmLabel={t.history.clearConfirm}
        cancelLabel={t.history.cancel}
        destructive
        onConfirm={() => {
          dispatch({ type: "history/cleared" });
          setClearAlertOpen(false);
        }}
        onCancel={() => setClearAlertOpen(false)}
      />
      <DropOverlay
        onDrop={(text) =>
          setLinkText((current) =>
            [current.trim(), text.trim()].filter(Boolean).join("\n"),
          )
        }
      />
      <Island />
    </div>
  );
}
