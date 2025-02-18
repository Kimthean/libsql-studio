"use client";

import MainScreen from "@/components/main-connection";
import { ConnectionConfigProvider } from "@/context/connection-config-provider";
import TursoDriver from "@/drivers/turso-driver";
import { useMemo } from "react";
import {
  SavedConnectionItem,
  SavedConnectionItemConfigConfig,
  SupportedDriver,
} from "../../connect/saved-connection-storage";
import RqliteDriver from "@/drivers/rqlite-driver";
import { DatabaseDriverProvider } from "@/context/DatabaseDriverProvider";

export default function ClientPageBody() {
  const driver = useMemo(() => {
    const config: SavedConnectionItemConfigConfig & {
      driver: SupportedDriver;
    } = JSON.parse(sessionStorage.getItem("connection") ?? "{}");

    if (config.driver === "rqlite") {
      return new RqliteDriver(config.url, config.username, config.password);
    }
    return new TursoDriver(config.url, config.token as string, true);
  }, []);

  const config = useMemo(() => {
    const config: SavedConnectionItemConfigConfig & {
      driver: SupportedDriver;
    } = JSON.parse(sessionStorage.getItem("connection") ?? "{}");

    return {
      id: "quick-connect",
      name: (config?.url ?? "") as string,
      label: "blue",
    } as SavedConnectionItem;
  }, []);

  return (
    <DatabaseDriverProvider driver={driver}>
      <ConnectionConfigProvider config={config}>
        <MainScreen />
      </ConnectionConfigProvider>
    </DatabaseDriverProvider>
  );
}
