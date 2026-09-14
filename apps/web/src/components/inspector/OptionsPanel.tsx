"use client";

import type { ReactNode } from "react";
import type { AudioFormat, Container, DownloadKind } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useStore } from "@/state/StoreProvider";
import type { DraftOptions, ReadyItem } from "@/state/types";
import { Segmented } from "../controls/Segmented";
import { Switch } from "../controls/Switch";
import styles from "./inspector.module.css";
import { QualityList } from "./QualityList";
import { SubtitleOptions } from "./SubtitleOptions";
import { TrimEditor } from "./TrimEditor";

const AUDIO_FORMATS: readonly AudioFormat[] = [
  "mp3",
  "m4a",
  "opus",
  "flac",
  "wav",
];
const CONTAINERS: readonly Container[] = ["mp4", "mkv"];

export function OptionsPanel({ item }: { item: ReadyItem }): ReactNode {
  const { t } = useI18n();
  const { dispatch } = useStore();
  const { options } = item;
  const change = (patch: Partial<DraftOptions>): void =>
    dispatch({ type: "item/optionsChanged", id: item.id, patch });
  return (
    <div className={styles.options}>
      <div className={styles.group}>
        <div className={styles.cellStack}>
          <Segmented<DownloadKind>
            label={t.inspector.kind}
            value={options.kind}
            onChange={(kind) => change({ kind })}
            options={[
              { value: "video", label: t.inspector.video, icon: "videoCamera" },
              { value: "audio", label: t.inspector.audio, icon: "musicNotes" },
            ]}
          />
          {options.kind === "video" ? (
            <Segmented<Container>
              label={t.inspector.format}
              value={options.container}
              onChange={(container) => change({ container })}
              options={CONTAINERS.map((value) => ({
                value,
                label: value.toUpperCase(),
              }))}
            />
          ) : (
            <Segmented<AudioFormat>
              label={t.inspector.format}
              value={options.audioFormat}
              onChange={(audioFormat) => change({ audioFormat })}
              options={AUDIO_FORMATS.map((value) => ({
                value,
                label: value === "opus" ? "Opus" : value.toUpperCase(),
              }))}
            />
          )}
        </div>
      </div>
      <div className={styles.group}>
        <p className={styles.groupLabel}>{t.inspector.quality}</p>
        <QualityList item={item} onChange={change} />
      </div>
      {item.media.duration ? (
        <div className={styles.group}>
          <p className={styles.groupLabel}>{t.inspector.trim}</p>
          <div className={styles.groupBody}>
            <div className={styles.cellStack}>
              <TrimEditor
                duration={item.media.duration}
                value={options.trim}
                onChange={(trim) => change({ trim })}
                thumbnail={item.media.thumbnail}
              />
            </div>
          </div>
          <p className={styles.groupNote}>{t.inspector.trimHelp}</p>
        </div>
      ) : null}
      <div className={styles.group}>
        {options.kind === "video" ? (
          <p className={styles.groupLabel}>{t.inspector.subtitles}</p>
        ) : null}
        <div className={styles.groupBody}>
          {options.kind === "video" ? (
            <SubtitleOptions options={options} onChange={change} />
          ) : null}
          <div className={styles.cell}>
            <span id={`embed-${item.id}`}>{t.inspector.embedMetadata}</span>
            <Switch
              checked={options.embedMetadata}
              onChange={(embedMetadata) => change({ embedMetadata })}
              labelledBy={`embed-${item.id}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
