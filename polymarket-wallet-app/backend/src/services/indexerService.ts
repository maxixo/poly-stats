import { JsonRpcProvider, Interface, formatUnits, type Log } from "ethers";
import Trade, { type TradeDoc } from "../models/Trade.js";
import IndexerState from "../models/IndexerState.js";
import exchangeAbi from "../abi/polymarketExchange.json" assert { type: "json" };

const DEFAULT_BACKFILL = 5000;
const MAX_RANGE = 2000;

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

const getEnvNumber = (key: string, fallback: number | null): number | null => {
  const value = process.env[key];
  if (value === undefined || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
): Promise<TradeDoc[]> => {
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

  const tradeDocs: TradeDoc[] = [];

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

const saveTrades = async (tradeDocs: TradeDoc[]): Promise<void> => {
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
  const tradeTopic = iface.getEvent("Trade").topicHash;

  const priceDecimals = getEnvNumber("PRICE_DECIMALS", 6) ?? 6;
  const sizeDecimals = getEnvNumber("SIZE_DECIMALS", 6) ?? 6;
  const confirmations = getEnvNumber("INDEXER_CONFIRMATIONS", 3) ?? 3;

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

  for (let start = fromBlock; start <= confirmedBlock; start += MAX_RANGE) {
    const end = Math.min(start + MAX_RANGE - 1, confirmedBlock);
    const logs = (await provider.getLogs({
      address: POLYMARKET_EXCHANGE,
      fromBlock: start,
      toBlock: end,
      topics: [tradeTopic]
    })) as IndexedLog[];
    const tradeDocs = await buildTrades(provider, iface, logs, priceDecimals, sizeDecimals);
    await saveTrades(tradeDocs);
    await setLastProcessedBlock(POLYMARKET_EXCHANGE, end);
  }
};

export const pollNewTrades = async (): Promise<void> => {
  try {
    await backfillTrades();
  } catch (error) {
    console.error("Indexer error", error);
  }
};
