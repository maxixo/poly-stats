import { JsonRpcProvider, Interface, formatUnits, type Log } from "ethers";
import Trade, { type TradeDoc } from "../models/Trade.js";
import type { InterfaceAbi } from "ethers";
import { createRequire } from "node:module";
import IndexerState from "../models/IndexerState.js";
const require = createRequire(import.meta.url);
const exchangeAbi = require("../abi/polymarketExchange.json") as InterfaceAbi;

const DEFAULT_BACKFILL = 5000;
const DEFAULT_MAX_RANGE = 1000;
let adaptiveMaxRange = DEFAULT_MAX_RANGE;

type IndexedLog = Log & { logIndex?: number; index?: number };

type ParsedArgs = {
  trader: string;
  marketId: string;
  side?: number;
  isBuy?: boolean;
  outcome?: number;
  price: bigint;
  size: bigint;
};

type TradeInsert = Omit<TradeDoc, "createdAt" | "updatedAt">;

const getEnvNumber = (key: string, fallback: number | null): number | null => {
  const value = process.env[key];
  if (value === undefined || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getMaxRange = (): number => {
  const configured = getEnvNumber("INDEXER_MAX_RANGE", DEFAULT_MAX_RANGE) ?? DEFAULT_MAX_RANGE;
  adaptiveMaxRange = Math.min(adaptiveMaxRange, configured);
  adaptiveMaxRange = Math.max(1, Math.floor(adaptiveMaxRange));
  return adaptiveMaxRange;
};

const isRangeTooLargeError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }
  const message = (error as { message?: string }).message ?? "";
  const nestedMessage = (error as { error?: { message?: string } }).error?.message ?? "";
  return `${message} ${nestedMessage}`.toLowerCase().includes("block range is too large");
};

const getSide = (parsedArgs: ParsedArgs): TradeDoc["side"] => {
  if (parsedArgs.side !== undefined) {
    return Number(parsedArgs.side) === 1 ? "YES" : "NO";
  }
  if (parsedArgs.isBuy !== undefined) {
    return parsedArgs.isBuy ? "YES" : "NO";
  }
  if (parsedArgs.outcome !== undefined) {
    return Number(parsedArgs.outcome) === 1 ? "YES" : "NO";
  }
  return "YES";
};

const getMarketId = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof (value as { toString?: () => string }).toString === "function") {
    return (value as { toString: () => string }).toString();
  }
  return String(value);
};

const getLogIndex = (log: IndexedLog): number => {
  if (typeof log.index === "number") {
    return log.index;
  }
  if (typeof log.logIndex === "number") {
    return log.logIndex;
  }
  return 0;
};

type ParsedLog = ReturnType<Interface["parseLog"]>;

const buildTrades = async (
  provider: JsonRpcProvider,
  iface: Interface,
  logs: IndexedLog[],
  priceDecimals: number,
  sizeDecimals: number
): Promise<TradeInsert[]> => {
  const blockCache = new Map<number, Date>();

  const getTimestamp = async (blockNumber: number): Promise<Date> => {
    const cached = blockCache.get(blockNumber);
    if (cached) {
      return cached;
    }
    const block = await provider.getBlock(blockNumber);
    if (!block) {
      const now = new Date();
      blockCache.set(blockNumber, now);
      return now;
    }
    const timestamp = new Date(Number(block.timestamp) * 1000);
    blockCache.set(blockNumber, timestamp);
    return timestamp;
  };

  const tradeDocs: TradeInsert[] = [];

  for (const log of logs) {
    let parsed: ParsedLog | null = null;
    try {
      parsed = iface.parseLog(log);
    } catch (error) {
      continue;
    }

    if (!parsed) {
      continue;
    }
    const args = parsed.args as unknown as ParsedArgs;
    const timestamp = await getTimestamp(log.blockNumber);
    const price = Number(formatUnits(args.price, priceDecimals));
    const size = Number(formatUnits(args.size, sizeDecimals));
    tradeDocs.push({
      wallet: args.trader.toLowerCase(),
      marketId: getMarketId(args.marketId),
      side: getSide(args),
      price,
      size,
      txHash: log.transactionHash,
      logIndex: getLogIndex(log),
      blockNumber: log.blockNumber,
      timestamp
    });
  }

  return tradeDocs;
};

const saveTrades = async (tradeDocs: TradeInsert[]): Promise<void> => {
  if (!tradeDocs.length) {
    return;
  }
  const bulkOps = tradeDocs.map((trade) => ({
    updateOne: {
      filter: { txHash: trade.txHash, logIndex: trade.logIndex },
      update: { $setOnInsert: trade },
      upsert: true
    }
  }));
  await Trade.bulkWrite(bulkOps, { ordered: false });
};

const getStateKey = (exchange: string): string => `exchange:${exchange}:lastBlock`;

const getLastProcessedBlock = async (exchange: string): Promise<number | null> => {
  const state = await IndexerState.findOne({ key: getStateKey(exchange) }).lean();
  return state ? Number(state.value) : null;
};

const setLastProcessedBlock = async (exchange: string, blockNumber: number): Promise<void> => {
  await IndexerState.updateOne(
    { key: getStateKey(exchange) },
    { $set: { value: String(blockNumber) } },
    { upsert: true }
  );
};

export const backfillTrades = async (): Promise<void> => {
  const { POLYGON_RPC, POLYMARKET_EXCHANGE } = process.env;
  if (!POLYGON_RPC || !POLYMARKET_EXCHANGE) {
    console.warn("Indexer disabled: POLYGON_RPC or POLYMARKET_EXCHANGE missing");
    return;
  }

  const provider = new JsonRpcProvider(POLYGON_RPC);
  const iface = new Interface(exchangeAbi);
  const tradeEvent = iface.getEvent("Trade");
  if (!tradeEvent) {
    throw new Error("Trade event not found in exchange ABI");
  }
  const tradeTopic = tradeEvent.topicHash;

  const priceDecimals = getEnvNumber("PRICE_DECIMALS", 6) ?? 6;
  const sizeDecimals = getEnvNumber("SIZE_DECIMALS", 6) ?? 6;
  const confirmations = getEnvNumber("INDEXER_CONFIRMATIONS", 3) ?? 3;
  let maxRange = getMaxRange();

  const latestBlock = await provider.getBlockNumber();
  const confirmedBlock = Math.max(latestBlock - confirmations, 0);
  const stateBlock = await getLastProcessedBlock(POLYMARKET_EXCHANGE);

  let fromBlock = stateBlock !== null ? stateBlock + 1 : null;
  if (fromBlock === null) {
    const configuredStart = getEnvNumber("INDEXER_START_BLOCK", null);
    fromBlock = configuredStart !== null ? configuredStart : Math.max(confirmedBlock - DEFAULT_BACKFILL, 0);
  }

  if (fromBlock === null) {
    return;
  }

  if (fromBlock > confirmedBlock) {
    return;
  }

  let start = fromBlock;
  while (start <= confirmedBlock) {
    const end = Math.min(start + maxRange - 1, confirmedBlock);
    try {
      const logs = (await provider.getLogs({
        address: POLYMARKET_EXCHANGE,
        fromBlock: start,
        toBlock: end,
        topics: [tradeTopic]
      })) as IndexedLog[];
      const tradeDocs = await buildTrades(provider, iface, logs, priceDecimals, sizeDecimals);
      await saveTrades(tradeDocs);
      await setLastProcessedBlock(POLYMARKET_EXCHANGE, end);
      start = end + 1;
    } catch (error) {
      if (isRangeTooLargeError(error) && maxRange > 1) {
        maxRange = Math.max(1, Math.floor(maxRange / 2));
        adaptiveMaxRange = Math.min(adaptiveMaxRange, maxRange);
        console.warn(`Indexer range too large for RPC; reducing to ${maxRange} blocks`);
        continue;
      }
      throw error;
    }
  }
};

export const pollNewTrades = async (): Promise<void> => {
  try {
    await backfillTrades();
  } catch (error) {
    console.error("Indexer error", error);
  }
};
