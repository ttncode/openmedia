"use client";

import type { ReactNode } from "react";
import { formatClock } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { QueueItem } from "@/state/types";
import { Thumbnail } from "../queue/Thumbnail";
import styles from "./inspector.module.css";
import { OptionsPanel } from "./OptionsPanel";
import { StatusCard } from "./StatusCard";

export function InspectorContent({
  item,
}: {
  item: QueueItem | null;
}): ReactNode {
  const { t } = useI18n();
  if (!item || item.type === "fetching")
    return <p className={styles.emptyState}>{t.inspector.empty}</p>;
  if (item.type === "fetch-error") return <StatusCard item={item} />;
  return (
    <>
      <Thumbnail
        key={item.id}
        src={item.media.thumbnail}
        kind={item.options.kind}
        alt={t.inspector.artworkAlt(item.media.title)}
        variant="artwork"
        badge={
          item.media.duration ? formatClock(item.media.duration) : undefined
        }
      />
      <div className={styles.titleBlock}>
        <h2>{item.media.title}</h2>
        <p className={styles.meta}>
          {[
            item.media.uploader,
            item.media.url.replace(/^https?:\/\//, "").split("/")[0],
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {item.type === "ready" ? (
        <OptionsPanel item={item} />
      ) : (
        <StatusCard item={item} />
      )}
    </>
  );
}
