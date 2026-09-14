"use client";

import { useEffect, useRef, type ChangeEvent, type ReactNode } from "react";
import type { StorageUsage } from "@/lib/api/types";
import { formatBytes, type Locale } from "@/lib/format";
import type { Messages } from "@/lib/i18n/en";
import { useI18n, type LanguagePreference } from "@/lib/i18n/I18nProvider";
import { ACCENTS, type ThemePreference } from "@/lib/theme";
import { useStore } from "@/state/StoreProvider";
import type { DefaultFormatId } from "@/state/types";
import { Capsule } from "../controls/Capsule";
import controlsStyles from "../controls/controls.module.css";
import { Icon } from "../controls/Icon";
import { Segmented } from "../controls/Segmented";
import { Stepper } from "../controls/Stepper";
import inspectorStyles from "../inspector/inspector.module.css";
import { Sheet } from "../overlays/Sheet";
import styles from "./settings.module.css";

const RETENTION_CHOICES = ["15", "60", "360", "1440"] as const;
const DEFAULT_FORMATS: readonly DefaultFormatId[] = [
  "video-mp4-1080",
  "video-mp4-720",
  "audio-m4a",
  "audio-mp3",
];
const LANGUAGES: readonly LanguagePreference[] = ["auto", "vi", "en"];
const MILLISECONDS_PER_DAY = 86_400_000;

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  focusCookies: boolean;
}

function daysUntil(isoDate: string | null): number {
  return isoDate === null
    ? 0
    : Math.max(
        0,
        Math.round(
          (new Date(isoDate).getTime() - Date.now()) / MILLISECONDS_PER_DAY,
        ),
      );
}

function storagePercent(storage: StorageUsage | null): number {
  if (storage === null) return 0;
  const total = storage.limit_bytes ?? storage.used_bytes + storage.free_bytes;
  return total > 0 ? Math.min(100, (storage.used_bytes / total) * 100) : 0;
}

function storageText(
  storage: StorageUsage | null,
  t: Messages,
  locale: Locale,
): string {
  if (storage === null) return "";
  const used = formatBytes(storage.used_bytes, locale);
  return storage.limit_bytes === null
    ? t.settings.storageUsedUnlimited(
        used,
        formatBytes(storage.free_bytes, locale),
      )
    : t.settings.storageUsed(used, formatBytes(storage.limit_bytes, locale));
}

function retentionLabel(
  t: Messages,
  minutes: (typeof RETENTION_CHOICES)[number],
): string {
  return t.time.retention[
    Number(minutes) as keyof Messages["time"]["retention"]
  ];
}

export function SettingsSheet({
  open,
  onClose,
  focusCookies,
}: SettingsSheetProps): ReactNode {
  const { t, locale } = useI18n();
  const { state, dispatch, commands } = useStore();
  const cookiesGroup = useRef<HTMLDivElement>(null);
  const { settings, storage, cookies, preferences, session } = state;

  useEffect(() => {
    if (open && focusCookies)
      cookiesGroup.current?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
  }, [open, focusCookies]);

  const chooseCookies = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void commands.uploadCookies(file);
  };

  const retentionValue =
    RETENTION_CHOICES.find(
      (choice) => Number(choice) === settings?.retention_minutes,
    ) ?? "60";
  const chooseDefaultFormat = (value: string): void => {
    const defaultFormat = DEFAULT_FORMATS.find((format) => format === value);
    if (defaultFormat)
      dispatch({ type: "preferences/changed", patch: { defaultFormat } });
  };
  const chooseLanguage = (value: string): void => {
    const language = LANGUAGES.find((candidate) => candidate === value);
    if (language)
      dispatch({ type: "preferences/changed", patch: { language } });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t.settings.title}
      labelledById="settings-title"
    >
      <div ref={cookiesGroup} className={inspectorStyles.group}>
        <p className={inspectorStyles.groupLabel}>{t.settings.cookies}</p>
        <div
          className={`${inspectorStyles.groupBody} ${focusCookies ? styles.highlight : ""}`}
        >
          <div className={inspectorStyles.cell}>
            <span className={styles.cellLabel}>
              <span
                className={`${styles.cellIcon} ${cookies?.present ? styles.green : styles.gray}`}
              >
                <Icon name="cookie" size={16} />
              </span>
              <span>
                {cookies?.present
                  ? t.settings.cookiesLoaded(
                      cookies.domains.join(", "),
                      daysUntil(cookies.expires_at),
                    )
                  : t.settings.cookiesNone}
              </span>
            </span>
            {cookies?.present ? (
              <Capsule
                variant="destructive"
                onClick={() => void commands.removeCookies()}
              >
                {t.settings.cookiesRemove}
              </Capsule>
            ) : (
              <label
                className={`${controlsStyles.capsule} ${controlsStyles.tinted}`}
              >
                {t.settings.cookiesChoose}
                <input
                  type="file"
                  accept=".txt,text/plain"
                  className="visually-hidden"
                  aria-label={t.settings.cookiesChoose}
                  onChange={chooseCookies}
                />
              </label>
            )}
          </div>
        </div>
        <p className={inspectorStyles.groupNote}>{t.settings.cookiesNote}</p>
      </div>

      <div className={inspectorStyles.group}>
        <p className={inspectorStyles.groupLabel}>{t.settings.downloads}</p>
        <div className={inspectorStyles.groupBody}>
          <div className={inspectorStyles.cellStack}>
            <span>{t.settings.retention}</span>
            <Segmented<(typeof RETENTION_CHOICES)[number]>
              label={t.settings.retention}
              value={retentionValue}
              onChange={(minutes) =>
                void commands.saveSettings({
                  retention_minutes: Number(minutes),
                })
              }
              options={RETENTION_CHOICES.map((minutes) => ({
                value: minutes,
                label: retentionLabel(t, minutes),
              }))}
            />
          </div>
          <div className={inspectorStyles.cell}>
            <span>{t.settings.concurrency}</span>
            <Stepper
              value={settings?.max_concurrent ?? 3}
              min={1}
              max={5}
              decreaseLabel={t.settings.decrease}
              increaseLabel={t.settings.increase}
              onChange={(value) =>
                void commands.saveSettings({ max_concurrent: value })
              }
            />
          </div>
          <div className={inspectorStyles.cell}>
            <label htmlFor="default-format">{t.settings.defaultFormat}</label>
            <select
              id="default-format"
              className={styles.select}
              value={preferences.defaultFormat}
              onChange={(event) => chooseDefaultFormat(event.target.value)}
            >
              {DEFAULT_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {t.settings.defaultFormats[format]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={inspectorStyles.group}>
        <p className={inspectorStyles.groupLabel}>{t.settings.appearance}</p>
        <div className={inspectorStyles.groupBody}>
          <div className={inspectorStyles.cellStack}>
            <Segmented<ThemePreference>
              label={t.settings.theme}
              value={preferences.theme}
              onChange={(theme) =>
                dispatch({ type: "preferences/changed", patch: { theme } })
              }
              options={[
                { value: "system", label: t.settings.themeSystem },
                { value: "light", label: t.settings.themeLight },
                { value: "dark", label: t.settings.themeDark },
              ]}
            />
          </div>
          <div className={inspectorStyles.cell}>
            <span>{t.settings.accent}</span>
            <div
              className={styles.swatches}
              role="radiogroup"
              aria-label={t.settings.accent}
            >
              {ACCENTS.map((accent) => (
                <button
                  key={accent.id}
                  type="button"
                  role="radio"
                  aria-checked={preferences.accent === accent.id}
                  aria-label={t.settings.accents[accent.id]}
                  className={styles.swatch}
                  style={{ background: accent.swatch, color: accent.swatch }}
                  onClick={() =>
                    dispatch({
                      type: "preferences/changed",
                      patch: { accent: accent.id },
                    })
                  }
                />
              ))}
            </div>
          </div>
          <div className={inspectorStyles.cell}>
            <label htmlFor="language">{t.settings.language}</label>
            <select
              id="language"
              className={styles.select}
              value={preferences.language}
              onChange={(event) => chooseLanguage(event.target.value)}
            >
              {LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {t.settings.languages[language]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={inspectorStyles.group}>
        <p className={inspectorStyles.groupLabel}>{t.settings.access}</p>
        <div className={inspectorStyles.groupBody}>
          <div className={inspectorStyles.cell}>
            <span className={styles.cellLabel}>
              <span className={`${styles.cellIcon} ${styles.gray}`}>
                <Icon name="lock" size={16} />
              </span>
              <span>
                {session?.auth_required
                  ? t.settings.passwordOn
                  : t.settings.passwordOff}
              </span>
            </span>
            {session?.auth_required ? (
              <Capsule
                variant="destructive"
                icon="signOut"
                onClick={() => void commands.signOut()}
              >
                {t.settings.signOut}
              </Capsule>
            ) : null}
          </div>
        </div>
        {session?.auth_required ? null : (
          <p className={inspectorStyles.groupNote}>{t.settings.passwordNote}</p>
        )}
      </div>

      <div className={inspectorStyles.group}>
        <p className={inspectorStyles.groupLabel}>{t.settings.storage}</p>
        <div className={inspectorStyles.groupBody}>
          <div className={inspectorStyles.cellStack}>
            <span>{storageText(storage, t, locale)}</span>
            <span className={styles.storageBar} aria-hidden="true">
              <span style={{ width: `${storagePercent(storage)}%` }} />
            </span>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
