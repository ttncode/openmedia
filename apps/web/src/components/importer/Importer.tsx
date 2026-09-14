"use client";

import {
  useLayoutEffect,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  detectPlatforms,
  hasPlaylist,
  parseLinks,
  type PlatformId,
} from "@/lib/links";
import type { PlaylistScope } from "@/state/types";
import { Capsule } from "../controls/Capsule";
import { Icon, type IconName } from "../controls/Icon";
import { Segmented } from "../controls/Segmented";
import styles from "./importer.module.css";

const MAX_FIELD_HEIGHT = 132;
const DEFAULT_PLAYLIST_LIMIT = 50;
const PLATFORM_LABELS: Record<PlatformId, { label: string; icon: IconName }> = {
  youtube: { label: "YouTube", icon: "youtube" },
  tiktok: { label: "TikTok", icon: "tiktok" },
  instagram: { label: "Instagram", icon: "instagram" },
  soundcloud: { label: "SoundCloud", icon: "soundcloud" },
  x: { label: "X", icon: "xLogo" },
  facebook: { label: "Facebook", icon: "facebook" },
  vimeo: { label: "Vimeo", icon: "vimeo" },
  other: { label: "Web", icon: "globe" },
};

interface ImporterProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (urls: string[], scope: PlaylistScope) => void;
  scope: PlaylistScope;
  onScopeChange: (scope: PlaylistScope) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  playlistLimit?: number;
  onInvalid?: () => void;
  onClipboardDenied?: () => void;
}

export function Importer({
  value,
  onChange,
  onSubmit,
  scope,
  onScopeChange,
  inputRef,
  playlistLimit = DEFAULT_PLAYLIST_LIMIT,
  onInvalid,
  onClipboardDenied,
}: ImporterProps): ReactNode {
  const { t } = useI18n();
  const links = parseLinks(value);
  const platforms = detectPlatforms(links);
  const showPlaylistChoice = links.some(hasPlaylist);

  useLayoutEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, MAX_FIELD_HEIGHT)}px`;
  }, [value, inputRef]);

  const submit = (): void => {
    if (links.length === 0) {
      onInvalid?.();
      return;
    }
    onSubmit(links, scope);
  };

  const pasteFromClipboard = async (): Promise<void> => {
    try {
      const text = await navigator.clipboard.readText();
      onChange([value.trim(), text.trim()].filter(Boolean).join("\n"));
    } catch {
      onClipboardDenied?.();
    } finally {
      inputRef.current?.focus();
    }
  };

  const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>): void => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    )
      return;
    event.preventDefault();
    submit();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    submit();
  };

  return (
    <form
      className={styles.importer}
      onSubmit={handleSubmit}
      onKeyDown={handleFormKeyDown}
      noValidate
    >
      <label className="visually-hidden" htmlFor="links">
        {t.importer.label}
      </label>
      <div className={styles.field}>
        <Icon name="link" size={18} />
        <textarea
          id="links"
          ref={inputRef}
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t.importer.placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="importer-hint"
        />
        <button
          type="button"
          className={styles.paste}
          onClick={() => void pasteFromClipboard()}
        >
          <Icon name="clipboard" size={16} />
          <span>{t.importer.paste}</span>
        </button>
      </div>
      <Capsule
        type="submit"
        variant="primary"
        size="large"
        className={styles.submit}
        disabled={value.trim() === ""}
      >
        {t.importer.fetch}
      </Capsule>
      {platforms.length > 0 ? (
        <div className={styles.chips} aria-live="polite">
          {platforms.map((platform) => (
            <span key={platform} className={styles.chip}>
              <Icon name={PLATFORM_LABELS[platform].icon} size={14} />
              {PLATFORM_LABELS[platform].label}
            </span>
          ))}
        </div>
      ) : null}
      {showPlaylistChoice ? (
        <div className={styles.playlist}>
          <p>{t.importer.playlistPrompt}</p>
          <Segmented<PlaylistScope>
            label={t.importer.playlistPrompt}
            value={scope}
            onChange={onScopeChange}
            options={[
              { value: "single", label: t.importer.playlistSingle },
              {
                value: "playlist",
                label: t.importer.playlistAll(playlistLimit),
              },
            ]}
          />
        </div>
      ) : null}
      <p id="importer-hint" className={styles.hint}>
        {t.importer.hint}
      </p>
    </form>
  );
}
