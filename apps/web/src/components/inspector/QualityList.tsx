"use client";

import type { ReactNode } from "react";
import { formatBytes } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { estimateBytes } from "@/state/options";
import type { DraftOptions, ReadyItem } from "@/state/types";
import { Icon } from "../controls/Icon";
import styles from "./inspector.module.css";

interface Choice {
  readonly key: string;
  readonly label: string;
  readonly checked: boolean;
  readonly patch: Partial<DraftOptions>;
}

function choicesFor(
  item: ReadyItem,
  labels: { best: string; original: string; lossless: string },
): Choice[] {
  const { options, formats } = item;
  if (options.kind === "audio") {
    if (options.audioFormat === "flac" || options.audioFormat === "wav") {
      return [
        {
          key: "best",
          label: labels.lossless,
          checked: true,
          patch: { audioQuality: "best" },
        },
      ];
    }
    return [
      {
        key: "320k",
        label: "320 kbps",
        checked: options.audioQuality === "320k",
        patch: { audioQuality: "320k" },
      },
      {
        key: "best",
        label: labels.original,
        checked: options.audioQuality === "best",
        patch: { audioQuality: "best" },
      },
    ];
  }
  if (formats.length === 0)
    return [
      {
        key: "best",
        label: labels.best,
        checked: true,
        patch: { qualityHeight: null },
      },
    ];
  return formats.map((format) => ({
    key: format.id,
    label: format.label,
    checked: format.height === options.qualityHeight,
    patch: { qualityHeight: format.height },
  }));
}

export function QualityList({
  item,
  onChange,
}: {
  item: ReadyItem;
  onChange: (patch: Partial<DraftOptions>) => void;
}): ReactNode {
  const { t, locale } = useI18n();
  const choices = choicesFor(item, {
    best: t.inspector.qualityBest,
    original: t.inspector.audioOriginal,
    lossless: t.inspector.audioLossless,
  });
  return (
    <div
      className={styles.groupBody}
      role="radiogroup"
      aria-label={t.inspector.quality}
    >
      {choices.map((choice) => {
        const size = estimateBytes(
          { ...item.options, ...choice.patch },
          item.formats,
          item.media.duration,
        );
        return (
          <button
            key={choice.key}
            type="button"
            role="radio"
            aria-checked={choice.checked}
            className={styles.choice}
            onClick={() => onChange(choice.patch)}
          >
            <span className={styles.choiceCheck}>
              <Icon name="check" size={16} weight="bold" />
            </span>
            <span className={styles.choiceName}>{choice.label}</span>
            <span className={styles.choiceSize}>
              {size === null ? "" : formatBytes(size, locale)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
