import { pollNewTrades } from "../services/indexerService.js";

let intervalId: NodeJS.Timeout | null = null;

export const startIndexer = (): void => {
  if (intervalId) {
    return;
  }
  const interval = Number(process.env.INDEXER_POLL_INTERVAL_MS || 15000);
  pollNewTrades();
  intervalId = setInterval(pollNewTrades, interval);
};