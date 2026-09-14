"use client";

import { useState, type ReactNode } from "react";
import type { DownloadKind } from "@/lib/api/types";
import { Icon } from "../controls/Icon";
import styles from "./queue.module.css";

interface ThumbnailProps {
  src: string;
  kind: DownloadKind;
  alt: string;
  variant: "row" | "artwork";
  badge?: string;
}

export function Thumbnail({
  src,
  kind,
  alt,
  variant,
  badge,
}: ThumbnailProps): ReactNode {
  const [failed, setFailed] = useState(false);
  const showImage = src !== "" && !failed;
  return (
    <span className={variant === "row" ? styles.thumb : styles.artwork}>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={styles.thumbGlyph}>
          <Icon
            name={kind === "audio" ? "musicNotes" : "filmStrip"}
            size={variant === "row" ? 18 : 40}
          />
        </span>
      )}
      {badge ? <span className={styles.artworkBadge}>{badge}</span> : null}
    </span>
  );
}
