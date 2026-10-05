"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ActivityType = "info" | "success" | "warn" | "error";

export interface ActivityItem {
  timestamp: string;
  message: string;
  signature?: string;
  type: ActivityType;
}

interface ActivityContextValue {
  activityFeed: ActivityItem[];
  appendLog: (message: string, type?: ActivityType, signature?: string) => void;
  clearLogs: () => void;
}

const ActivityContext = createContext<ActivityContextValue>({
  activityFeed: [],
  appendLog: () => {},
  clearLogs: () => {},
});

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);

  useEffect(() => {
    setActivityFeed([
      {
        timestamp: new Date().toLocaleTimeString(),
        message: "Connected to Solana Devnet • Ready to lookup or create milestone escrows",
        type: "info",
      },
    ]);
  }, []);

  const appendLog = useCallback(
    (message: string, type: ActivityType = "info", signature?: string) => {
      setActivityFeed((items) => [
        { timestamp: new Date().toLocaleTimeString(), message, type, signature },
        ...items,
      ]);
    },
    []
  );

  const clearLogs = useCallback(() => {
    setActivityFeed([]);
  }, []);

  return (
    <ActivityContext.Provider value={{ activityFeed, appendLog, clearLogs }}>
      {children}
    </ActivityContext.Provider>
  );
}

export const useActivity = () => useContext(ActivityContext);
