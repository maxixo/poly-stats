import { createHash } from "node:crypto";
import Trade, { type TradeDoc } from "../models/Trade.js";
import { fetchClobTrades } from "./polymarketService.js";
import { normalizeAddress } from "../utils/validation.js";
import { syncMarketsByIds } from "./marketSyncService.js";

type TradeInsert = Omit<TradeDoc, "createdAt" | "updatedAt" | "_id">;

type TradePayload = Record<string, unknown>;

const getEnvNumber = (key: string, fallback: number): number => {
  const value = process.env[key];
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getEnvString = (key: string, fallback: string): string => {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : fallback;
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parseTimestamp = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return value;
  }
  const numeric = parseNumber(value);
  if (numeric !== null) {
    const ms = numeric > 1e12 ? numeric : numeric * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

const pickField = (record: TradePayload, override: string, candidates: string[]): unknown => {
  if (override && override in record) {
    return record[override];
  }
  for (const candidate of candidates) {
    if (candidate in record) {
      return record[candidate];
    }
  }
  return undefined;
};

const parseSide = (value: unknown): TradeDoc["side"] | null => {
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();
    if (normalized === "YES" || normalized === "NO") {
      return normalized;
    }
    if (normalized === "1") {
      return "YES";
    }
    if (normalized === "0") {
      return "NO";
    }
  }
  if (typeof value === "number") {
    if (value === 1) {
      return "YES";
    }
    if (value === 0) {
      return "NO";
    }
  }
  return null;
};

const buildSyntheticTradeId = (trade: {
  wallet: string;
  marketId: string;
  timestamp: Date;
  price: number;
  size: number;
}): string => {
  const raw = `${trade.wallet}:${trade.marketId}:${trade.timestamp.toISOString()}:${trade.price}:${trade.size}`;
  return createHash("sha256").update(raw).digest("hex");
};

const extractTrades = (payload: unknown): TradePayload[] => {
  if (Array.isArray(payload)) {
    return payload as TradePayload[];
  }
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) {
      return obj.data as TradePayload[];
    }
    if (Array.isArray(obj.trades)) {
      return obj.trades as TradePayload[];
    }
  }
  return [];
};

const extractCursor = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const obj = payload as Record<string, unknown>;
  const candidates = ["next_cursor", "nextCursor", "cursor", "next"];
  for (const key of candidates) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return null;
};

const buildTradesQuery = (start: Date, end: Date, limit: number, cursor?: string | null): Record<string, unknown> => {
  const startParam = getEnvString("POLYMARKET_TRADES_START_PARAM", "start_time");
  const endParam = getEnvString("POLYMARKET_TRADES_END_PARAM", "end_time");
  const limitParam = getEnvString("POLYMARKET_TRADES_LIMIT_PARAM", "limit");
  const cursorParam = getEnvString("POLYMARKET_TRADES_CURSOR_PARAM", "cursor");

  const query: Record<string, unknown> = {
    [startParam]: Math.floor(start.getTime() / 1000),
    [endParam]: Math.floor(end.getTime() / 1000),
    [limitParam]: limit
  };

  if (cursor) {
    query[cursorParam] = cursor;
  }

  return query;
};

const parseTradeRecord = (record: TradePayload): TradeInsert | null => {
  const tradeIdField = getEnvString("POLYMARKET_TRADE_ID_FIELD", "");
  const walletField = getEnvString("POLYMARKET_TRADE_WALLET_FIELD", "");
  const marketField = getEnvString("POLYMARKET_TRADE_MARKET_FIELD", "");
  const sideField = getEnvString("POLYMARKET_TRADE_SIDE_FIELD", "");
  const priceField = getEnvString("POLYMARKET_TRADE_PRICE_FIELD", "");
  const sizeField = getEnvString("POLYMARKET_TRADE_SIZE_FIELD", "");
  const timestampField = getEnvString("POLYMARKET_TRADE_TIMESTAMP_FIELD", "");
  const makerField = getEnvString("POLYMARKET_TRADE_MAKER_FIELD", "");
  const takerField = getEnvString("POLYMARKET_TRADE_TAKER_FIELD", "");

  const tradeIdValue = pickField(record, tradeIdField, ["id", "trade_id", "tradeId", "tx_hash"]);
  const tradeId = typeof tradeIdValue === "string" && tradeIdValue.trim() ? tradeIdValue.trim() : null;

  const walletValue = pickField(record, walletField, ["trader", "wallet", "user", "taker", "maker"]);
  const taker = pickField(record, takerField, ["taker", "takerAddress"]);
  const maker = pickField(record, makerField, ["maker", "makerAddress"]);
  const wallet =
    typeof walletValue === "string"
      ? walletValue
      : typeof taker === "string"
      ? taker
      : typeof maker === "string"
      ? maker
      : null;

  const marketIdValue = pickField(record, marketField, ["market_id", "marketId", "condition_id", "conditionId", "market"]);
  const marketId = typeof marketIdValue === "string" ? marketIdValue : null;

  const sideValue = pickField(record, sideField, ["outcome", "side", "outcomeId", "outcome_id"]);
  const side = parseSide(sideValue);

  const priceValue = pickField(record, priceField, ["price", "avg_price", "rate"]);
  const sizeValue = pickField(record, sizeField, ["size", "amount", "quantity", "shares"]);
  const timeValue = pickField(record, timestampField, ["timestamp", "created_at", "createdAt", "time"]);

  const price = parseNumber(priceValue);
  const size = parseNumber(sizeValue);
  const timestamp = parseTimestamp(timeValue);

  if (!wallet || !marketId || !side || price === null || size === null || !timestamp) {
    return null;
  }

  const normalizedWallet = normalizeAddress(wallet);
  const payloadBase = {
    wallet: normalizedWallet,
    marketId,
    side,
    price,
    size,
    timestamp,
    source: "polymarket_api",
    maker: typeof maker === "string" ? normalizeAddress(maker) : undefined,
    taker: typeof taker === "string" ? normalizeAddress(taker) : undefined
  };

  const resolvedTradeId = tradeId ?? buildSyntheticTradeId(payloadBase);

  return {
    ...payloadBase,
    tradeId: resolvedTradeId
  };
};

export const syncPolymarketTrades = async (): Promise<{ inserted: number; fetched: number }> => {
  const days = getEnvNumber("POLYMARKET_TRADES_DAYS", 30);
  const limit = getEnvNumber("POLYMARKET_TRADES_LIMIT", 200);
  const maxPages = getEnvNumber("POLYMARKET_TRADES_MAX_PAGES", 5);

  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  let cursor: string | null = null;
  let fetched = 0;
  let inserted = 0;
  const marketIds = new Set<string>();

  for (let page = 0; page < maxPages; page += 1) {
    const query = buildTradesQuery(start, end, limit, cursor);
    const payload = await fetchClobTrades(query);
    const trades = extractTrades(payload);
    fetched += trades.length;

    const parsed = trades
      .map(parseTradeRecord)
      .filter((trade): trade is TradeInsert => Boolean(trade));

    parsed.forEach((trade) => marketIds.add(trade.marketId));

    if (parsed.length) {
      const ops = parsed.map((trade) => ({
        updateOne: {
          filter: { source: trade.source, tradeId: trade.tradeId },
          update: { $setOnInsert: trade },
          upsert: true
        }
      }));
      const result = await Trade.bulkWrite(ops, { ordered: false });
      inserted += result.upsertedCount || 0;
    }

    cursor = extractCursor(payload);
    console.log("[polymarket] trades page", {
      page: page + 1,
      fetched: trades.length,
      inserted,
      cursor: cursor || "none"
    });
    if (!cursor || trades.length === 0) {
      break;
    }
  }

  if (marketIds.size > 0) {
    await syncMarketsByIds([...marketIds]);
  }

  return { inserted, fetched };
};
