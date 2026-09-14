"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useStore } from "@/state/StoreProvider";
import { BrandMark } from "../controls/BrandMark";
import { Capsule } from "../controls/Capsule";
import styles from "./auth.module.css";

export function LoginScreen(): ReactNode {
  const { t } = useI18n();
  const { commands } = useStore();
  const [password, setPassword] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    const signedIn = await commands.signIn(password);
    setBusy(false);
    setFailed(!signedIn);
    if (signedIn) void commands.loadServerState();
  };

  return (
    <main className={styles.screen}>
      <form
        className={`${styles.card} ${failed ? styles.shake : ""}`}
        onSubmit={(event) => void submit(event)}
      >
        <BrandMark size={48} />
        <h1>{t.auth.title}</h1>
        <label className={styles.field}>
          <span>{t.auth.password}</span>
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {failed ? (
          <p role="alert" className={styles.error}>
            {t.auth.wrong}
          </p>
        ) : null}
        <Capsule
          type="submit"
          variant="primary"
          size="large"
          disabled={busy || password === ""}
        >
          {t.auth.submit}
        </Capsule>
      </form>
    </main>
  );
}
