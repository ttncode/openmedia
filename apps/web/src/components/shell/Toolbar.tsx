"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useStore } from "@/state/StoreProvider";
import { BrandMark } from "../controls/BrandMark";
import { IconButton } from "../controls/IconButton";
import styles from "./shell.module.css";

interface ToolbarProps {
  scrolled: boolean;
  title: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenShortcuts: () => void;
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function Toolbar({
  scrolled,
  title,
  sidebarOpen,
  onToggleSidebar,
  onOpenShortcuts,
}: ToolbarProps): ReactNode {
  const { t } = useI18n();
  const { state, dispatch } = useStore();
  const isDark =
    state.preferences.theme === "dark" ||
    (state.preferences.theme === "system" && prefersDark());
  const toggleTheme = (): void => {
    const apply = (): void =>
      dispatch({
        type: "preferences/changed",
        patch: { theme: isDark ? "light" : "dark" },
      });
    if (
      typeof document.startViewTransition === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      document.startViewTransition(apply);
    else apply();
  };
  return (
    <header className={styles.toolbar} data-scrolled={scrolled}>
      <IconButton
        className={styles.sidebarToggle}
        label={t.nav.showSidebar}
        icon="list"
        aria-expanded={sidebarOpen}
        onClick={onToggleSidebar}
      />
      <span className={styles.toolbarBrand}>
        <BrandMark size={22} />
      </span>
      <p className={styles.toolbarTitle} aria-hidden="true">
        {title}
      </p>
      <div className={styles.toolbarActions}>
        <IconButton
          label={t.nav.toggleTheme}
          icon={isDark ? "sun" : "moon"}
          onClick={toggleTheme}
        />
        <IconButton
          className={styles.shortcutsButton}
          label={t.nav.shortcuts}
          icon="keyboard"
          onClick={onOpenShortcuts}
        />
      </div>
    </header>
  );
}
