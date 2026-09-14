"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const ClientApp = dynamic(
  async () => {
    const [{ StoreProvider }, { AppShell }] = await Promise.all([
      import("@/state/StoreProvider"),
      import("@/components/shell/AppShell"),
    ]);
    return function OpenMediaApp(): ReactNode {
      return (
        <StoreProvider>
          <AppShell />
        </StoreProvider>
      );
    };
  },
  { ssr: false },
);

export function OpenMediaClient(): ReactNode {
  return <ClientApp />;
}
