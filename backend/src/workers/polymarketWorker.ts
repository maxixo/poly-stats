import { syncPolymarketTrades } from "../services/tradeSyncService.js";
import { syncMarkets } from "../services/marketSyncService.js";

let intervalId: NodeJS.Timeout | null = null;
let isRunning = false;

const getEnvNumber = (key: string, fallback: number): number => {
  const value = process.env[key];
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const runOnce = async (): Promise<void> => {
  if (isRunning) {
    return;
  }
  isRunning = true;
  try {
    const result = await syncPolymarketTrades();
    console.log("[polymarket] sync complete", result);
    const syncMarketsEnabled = process.env.POLYMARKET_MARKET_SYNC_ENABLED !== "false";
    if (syncMarketsEnabled) {
      await syncMarkets();
    }
  } catch (error) {
    console.error("[polymarket] sync error", error);
  } finally {
    isRunning = false;
  }
};

export const startPolymarketSync = (): void => {
  if (intervalId) {
    return;
  }
  if (process.env.POLYMARKET_SYNC_ENABLED !== "true") {
    console.log("[polymarket] sync disabled");
    return;
  }
  const interval = getEnvNumber("POLYMARKET_SYNC_INTERVAL_MS", 10 * 60 * 1000);
  void runOnce();
  intervalId = setInterval(() => {
    void runOnce();
  }, interval);
};
