import Market, { type MarketDoc } from "../models/Market.js";
import { fetchGammaMarkets } from "./polymarketService.js";

type GammaMarket = {
  id?: string;
  conditionId?: string;
  slug?: string;
  question?: string;
  title?: string;
  category?: string;
  categoryId?: string;
  group?: { name?: string };
  active?: boolean;
  closed?: boolean;
  tags?: Array<{ name?: string }>;
};

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

const parseMarketId = (market: GammaMarket): string | null =>
  market.conditionId ?? market.id ?? market.slug ?? null;

const parseCategory = (market: GammaMarket): string | null => {
  if (market.category) {
    return market.category;
  }
  if (market.group?.name) {
    return market.group.name;
  }
  const tag = market.tags?.[0]?.name;
  return tag ?? null;
};

const parseQuestion = (market: GammaMarket): string | null => market.question ?? market.title ?? null;

const toMarketDoc = (market: GammaMarket, source: string): MarketDoc | null => {
  const marketId = parseMarketId(market);
  if (!marketId) {
    return null;
  }
  return {
    marketId,
    slug: market.slug,
    question: parseQuestion(market) || undefined,
    category: parseCategory(market) || undefined,
    active: market.active ?? (market.closed !== undefined ? !market.closed : undefined),
    source,
    lastUpdated: new Date(),
    metadata: market
  } as MarketDoc;
};

const upsertMarkets = async (markets: MarketDoc[]): Promise<void> => {
  if (!markets.length) {
    return;
  }
  const ops = markets.map((market) => ({
    updateOne: {
      filter: { marketId: market.marketId },
      update: { $set: market },
      upsert: true
    }
  }));
  await Market.bulkWrite(ops, { ordered: false });
};

export const syncMarkets = async (): Promise<number> => {
  const limit = getEnvNumber("POLYMARKET_MARKET_LIMIT", 200);
  const pages = getEnvNumber("POLYMARKET_MARKET_PAGES", 1);
  const offsetParam = getEnvString("POLYMARKET_MARKET_OFFSET_PARAM", "offset");
  const source = "gamma_api";
  let total = 0;

  for (let page = 0; page < pages; page += 1) {
    const query: Record<string, unknown> = {
      active: true,
      closed: false,
      limit
    };
    if (page > 0) {
      query[offsetParam] = page * limit;
    }
    const payload = await fetchGammaMarkets(query);
    const rawMarkets = Array.isArray(payload) ? (payload as GammaMarket[]) : [];
    const docs = rawMarkets.map((market) => toMarketDoc(market, source)).filter(Boolean) as MarketDoc[];
    await upsertMarkets(docs);
    total += docs.length;
    console.log("[polymarket] markets page", { page: page + 1, count: docs.length });
    if (!rawMarkets.length) {
      break;
    }
  }

  return total;
};

export const syncMarketsByIds = async (marketIds: string[]): Promise<void> => {
  if (!marketIds.length) {
    return;
  }
  const idsParam = getEnvString("POLYMARKET_MARKET_IDS_PARAM", "conditionIds");
  const query: Record<string, unknown> = {
    [idsParam]: marketIds.join(","),
    limit: marketIds.length
  };

  try {
    const payload = await fetchGammaMarkets(query);
    const rawMarkets = Array.isArray(payload) ? (payload as GammaMarket[]) : [];
    const docs = rawMarkets.map((market) => toMarketDoc(market, "gamma_api")).filter(Boolean) as MarketDoc[];
    await upsertMarkets(docs);
    console.log("[polymarket] markets sync by ids", { requested: marketIds.length, saved: docs.length });
  } catch (error) {
    console.log("[polymarket] markets sync by ids failed, falling back to bulk sync");
    await syncMarkets();
  }
};
