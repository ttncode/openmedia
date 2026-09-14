"use client";

import type { ReactNode } from "react";
import type { SubtitleMode } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { DraftOptions } from "@/state/types";
import { Segmented } from "../controls/Segmented";
import styles from "./inspector.module.css";

type SubtitleChoice = "off" | "vi" | "en";

export function SubtitleOptions({
  options,
  onChange,
}: {
  options: DraftOptions;
  onChange: (patch: Partial<DraftOptions>) => void;
}): ReactNode {
  const { t } = useI18n();
  const first = options.subtitleLanguages[0];
  const current: SubtitleChoice =
    first === "vi" || first === "en" ? first : "off";
  return (
    <div className={styles.cellStack}>
      <Segmented<SubtitleChoice>
        label={t.inspector.subtitles}
        value={current}
        onChange={(choice) =>
          onChange({ subtitleLanguages: choice === "off" ? [] : [choice] })
        }
        options={[
          { value: "off", label: t.inspector.subtitlesOff },
          { value: "vi", label: t.inspector.subtitlesVietnamese },
          { value: "en", label: t.inspector.subtitlesEnglish },
        ]}
      />
      {current !== "off" ? (
        <Segmented<SubtitleMode>
          label={t.inspector.subtitles}
          value={options.subtitleMode}
          onChange={(mode) => onChange({ subtitleMode: mode })}
          options={[
            { value: "embed", label: t.inspector.subtitleEmbed },
            { value: "srt", label: t.inspector.subtitleFile },
          ]}
        />
      ) : null}
    </div>
  );
}
