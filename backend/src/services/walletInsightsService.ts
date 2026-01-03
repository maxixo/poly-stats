import WalletInsight from "../models/WalletInsight.js";
import { generateGeminiInsights } from "./geminiService.js";
import { getWalletAnalysis, getWalletLeaderboard } from "./walletAnalysisService.js";

type InsightsResponse = {
  scope: string;
  rangeDays: number;
  generatedAt: Date;
  model: string;
  insights: unknown;
  rawText: string;
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

const buildPrompt = (payload: unknown): string => {
  return [
    "Analyze this trading data from top Polymarket wallets:",
    JSON.stringify(payload),
    "",
    "Please identify:",
    "1. Common trading patterns among successful wallets",
    "2. Which market categories have highest win rates",
    "3. Optimal hold times for different market types",
    "4. Any contrarian or momentum trading signals",
    "5. Risk management patterns (position sizing, diversification)",
    "",
    "Format response as JSON with categories: patterns, market_insights, hold_time_recommendations, risk_analysis"
  ].join("\n");
};

export const getTopWalletInsights = async (options: {
  days: number;
  limit: number;
  minWinRate: number;
  minTrades: number;
  minProfit: number;
  force?: boolean;
}): Promise<InsightsResponse> => {
  const { days, limit, minWinRate, minTrades, minProfit, force } = options;
  const ttlMinutes = getEnvNumber("GEMINI_INSIGHT_TTL_MINUTES", 60);
  const cutoff = new Date(Date.now() - ttlMinutes * 60 * 1000);
  const scope = "top-wallets";

  if (!force) {
    const cached = await WalletInsight.findOne({
      scope,
      rangeDays: days,
      generatedAt: { $gte: cutoff }
    })
      .sort({ generatedAt: -1 })
      .lean();

    if (cached) {
      return {
        scope,
        rangeDays: days,
        generatedAt: cached.generatedAt ?? new Date(),
        model: cached.model || getEnvString("GEMINI_MODEL", "gemini-1.5-flash"),
        insights: cached.payload,
        rawText: ""
      };
    }
  }

  const leaderboard = await getWalletLeaderboard(days, limit, minWinRate, minTrades, minProfit);
  const topWallets = leaderboard.wallets.slice(0, Math.min(limit, 8));
  const analyses = await Promise.all(
    topWallets.map((wallet) => getWalletAnalysis(wallet.wallet, days, 50))
  );

  const payload = {
    range: leaderboard.range,
    filters: leaderboard.filters,
    summary: leaderboard.summary,
    wallets: leaderboard.wallets.map((wallet) => ({
      wallet: wallet.wallet,
      netProfit: wallet.netProfit,
      winRate: wallet.winRate,
      tradeCount: wallet.tradeCount,
      roi: wallet.roi,
      avgTradeSize: wallet.avgTradeSize
    })),
    details: analyses.map((analysis) => ({
      wallet: analysis.wallet,
      performance: analysis.performance,
      behavior: analysis.behavior,
      categoryStats: analysis.categoryStats.slice(0, 5),
      holdTimeDistribution: analysis.holdTimeDistribution,
      topTrades: analysis.topTrades.slice(0, 5)
    }))
  };

  console.log("[gemini] generating insights", { wallets: leaderboard.wallets.length, days });
  const response = await generateGeminiInsights(buildPrompt(payload));

  const model = getEnvString("GEMINI_MODEL", "gemini-1.5-flash");
  const generatedAt = new Date();
  await WalletInsight.create({
    scope,
    rangeDays: days,
    rangeStart: leaderboard.range.start,
    rangeEnd: leaderboard.range.end,
    model,
    payload: response.parsed ?? null,
    generatedAt
  });

  return {
    scope,
    rangeDays: days,
    generatedAt,
    model,
    insights: response.parsed ?? null,
    rawText: response.rawText
  };
};
