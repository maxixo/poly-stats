import { pollNewTrades } from "../services/indexerService.js";

let intervalId: NodeJS.Timeout | null = null;
let isRunning = false;

const runOnce = async (): Promise<void> => {
  if (isRunning) {
    return;
  }
  isRunning = true;
  try {
    await pollNewTrades();
  } finally {
    isRunning = false;
  }
};

export const startIndexer = (): void => {
  if (intervalId) {
    return;
  }
  const interval = Number(process.env.INDEXER_POLL_INTERVAL_MS || 15000);
  void runOnce();
  intervalId = setInterval(() => {
    void runOnce();
  }, interval);
};